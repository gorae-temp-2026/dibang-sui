package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ErrSignedUploadURLNotSupported: localDisk(dev fallback) 등에서 presigned URL 발급을 지원하지 않음.
// 핸들러는 이 케이스를 503/501로 매핑하거나 multipart 폴백 안내.
var ErrSignedUploadURLNotSupported = errors.New("signed upload URL not supported by this driver")

// StorageUploader uploads an object and returns its public URL.
// 인터페이스화 → 핸들러 단위테스트에서 모킹(라이브 Supabase 불필요).
// bucket 인자: faea79e 청사진 "v3-uploads-public/private 2분리"에 따라 호출처가 카테고리별 bucket 결정.
type StorageUploader interface {
	Upload(ctx context.Context, bucket, objectPath, contentType string, body io.Reader) (publicURL string, err error)
	// IssueSignedUploadURL: 클라이언트가 직접 PUT으로 업로드할 서명 URL 발급(Photo Sharing presigned 흐름).
	// ttlSeconds=만료 시간(초). 0이면 드라이버 기본값. localDisk 등 미지원은 ErrSignedUploadURLNotSupported.
	IssueSignedUploadURL(ctx context.Context, bucket, objectPath, contentType string, ttlSeconds int) (uploadURL string, err error)
	// Download: ZIP 스트리밍용. service_role bearer로 객체 본문을 받아 io.ReadCloser 반환.
	// 호출자는 반드시 Close() 한다. 404 등 비-2xx는 error.
	Download(ctx context.Context, bucket, objectPath string) (io.ReadCloser, error)
	// Delete: 객체 삭제. tmp 이동 후 원본 정리·고아 sweep용 (STORAGE.md "정리는 서버 몫").
	// 빈 bucket/objectPath·경로 탈출은 error.
	Delete(ctx context.Context, bucket, objectPath string) error
	// Copy: 스토리지 내부 복사 (클라이언트 재전송 없음). draft(v3-tmp) → wedding 경로
	// 이동의 1단계 (copy → 참조 재작성 → Delete). 선례: cmd/rebucket-photos.
	Copy(ctx context.Context, srcBucket, srcKey, dstBucket, dstKey string) error
}

// supabaseStorage: Supabase Storage REST 클라이언트.
// 서버측 업로드라 service_role 키 사용(RLS 우회). bucket은 호출 인자.
type supabaseStorage struct {
	baseURL    string // SUPABASE_URL
	serviceKey string
	client     *http.Client
}

func NewSupabaseStorage(supabaseURL, serviceKey string) StorageUploader {
	return &supabaseStorage{
		baseURL:    strings.TrimRight(supabaseURL, "/"),
		serviceKey: serviceKey,
		client:     &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *supabaseStorage) Upload(ctx context.Context, bucket, objectPath, contentType string, body io.Reader) (string, error) {
	endpoint := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.baseURL, bucket, objectPath)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("apikey", s.serviceKey)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("supabase storage upload failed: %d %s", resp.StatusCode, string(b))
	}
	// public 버킷 기준 공개 URL. private 버킷에 대해 반환해도 anon GET은 막힘 — 호출자가 용도 판단.
	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.baseURL, bucket, objectPath), nil
}

// IssueSignedUploadURL: Supabase Storage signed upload URL API 호출.
// POST /storage/v1/object/upload/sign/{bucket}/{path} → { url: "/object/upload/sign/.../?token=..." }.
// 응답 url을 절대 URL로 결합해 반환(클라이언트가 PUT으로 직접 업로드).
func (s *supabaseStorage) IssueSignedUploadURL(ctx context.Context, bucket, objectPath, contentType string, ttlSeconds int) (string, error) {
	endpoint := fmt.Sprintf("%s/storage/v1/object/upload/sign/%s/%s", s.baseURL, bucket, objectPath)
	if ttlSeconds > 0 {
		endpoint += fmt.Sprintf("?expires_in=%d", ttlSeconds)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader("{}"))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("apikey", s.serviceKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return "", fmt.Errorf("supabase signed upload url failed: %d %s", resp.StatusCode, string(b))
	}
	var out struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", fmt.Errorf("supabase signed upload url decode: %w", err)
	}
	if out.URL == "" {
		return "", fmt.Errorf("supabase signed upload url: empty url in response")
	}
	if strings.HasPrefix(out.URL, "http://") || strings.HasPrefix(out.URL, "https://") {
		return out.URL, nil
	}
	return s.baseURL + "/storage/v1" + out.URL, nil
}

// Download: Supabase Storage 객체 GET (service_role bearer).
// ZIP 스트리밍 시 호출자가 받은 ReadCloser를 zip.Writer에 io.Copy 후 Close.
func (s *supabaseStorage) Download(ctx context.Context, bucket, objectPath string) (io.ReadCloser, error) {
	endpoint := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.baseURL, bucket, objectPath)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("apikey", s.serviceKey)
	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		_ = resp.Body.Close()
		return nil, fmt.Errorf("supabase storage download failed: %d %s", resp.StatusCode, string(b))
	}
	return resp.Body, nil
}

// Delete: Supabase Storage 객체 삭제 (service_role bearer).
// DELETE /storage/v1/object/{bucket}/{path}. 비-2xx는 error.
func (s *supabaseStorage) Delete(ctx context.Context, bucket, objectPath string) error {
	if bucket == "" || objectPath == "" {
		return fmt.Errorf("invalid object path")
	}
	endpoint := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.baseURL, bucket, objectPath)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("apikey", s.serviceKey)
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("supabase storage delete failed: %d %s", resp.StatusCode, string(b))
	}
	return nil
}

// Copy: Supabase Storage 객체 복사 (service_role).
// POST /storage/v1/object/copy — 요청 형태는 cmd/rebucket-photos와 동일.
func (s *supabaseStorage) Copy(ctx context.Context, srcBucket, srcKey, dstBucket, dstKey string) error {
	if srcBucket == "" || srcKey == "" || dstBucket == "" || dstKey == "" {
		return fmt.Errorf("invalid object path")
	}
	payload, err := json.Marshal(map[string]string{
		"bucketId":          srcBucket,
		"sourceKey":         srcKey,
		"destinationBucket": dstBucket,
		"destinationKey":    dstKey,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+"/storage/v1/object/copy", strings.NewReader(string(payload)))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("apikey", s.serviceKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("supabase storage copy failed: %d %s", resp.StatusCode, string(b))
	}
	return nil
}

// ── 로컬 디스크 폴백 (dev 한정, UPLOAD_DRIVER=local 명시 opt-in 시에만) ──

const localUploadDir = "./uploads"

type localDiskStorage struct{ dir string }

// NewLocalDiskStorage: 기본 ./uploads 사용 (main.go).
func NewLocalDiskStorage() StorageUploader { return &localDiskStorage{dir: localUploadDir} }

func newLocalDiskStorageAt(dir string) StorageUploader { return &localDiskStorage{dir: dir} }

// localDiskStorage는 단일 dir에 모든 객체를 저장. bucket 인자는 prefix로 사용해 충돌 회피.
func (l *localDiskStorage) Upload(_ context.Context, bucket, objectPath, _ string, body io.Reader) (string, error) {
	clean := filepath.Clean(filepath.Join(bucket, objectPath))
	if clean == "." || strings.HasPrefix(clean, "..") || filepath.IsAbs(clean) {
		return "", fmt.Errorf("invalid object path")
	}
	full := filepath.Join(l.dir, clean)
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return "", err
	}
	dst, err := os.Create(full)
	if err != nil {
		return "", err
	}
	defer dst.Close()
	if _, err := io.Copy(dst, body); err != nil {
		return "", err
	}
	return "/uploads/" + filepath.ToSlash(clean), nil
}

// localDiskStorage는 presigned 발급 미지원(prod 안 쓰는 dev fallback).
// 핸들러는 ErrSignedUploadURLNotSupported를 503으로 매핑(인프라 액션 안내).
func (l *localDiskStorage) IssueSignedUploadURL(_ context.Context, _, _, _ string, _ int) (string, error) {
	return "", ErrSignedUploadURLNotSupported
}

// Download: 로컬 파일 열기. path traversal 방어는 Upload와 동일 규칙.
func (l *localDiskStorage) Download(_ context.Context, bucket, objectPath string) (io.ReadCloser, error) {
	clean := filepath.Clean(filepath.Join(bucket, objectPath))
	if clean == "." || strings.HasPrefix(clean, "..") || filepath.IsAbs(clean) {
		return nil, fmt.Errorf("invalid object path")
	}
	return os.Open(filepath.Join(l.dir, clean))
}

// Delete: 로컬 파일 삭제. 빈 인자 차단(디렉토리 오삭제 방지) + 정규화 결과가
// 해당 버킷 폴더 안에 남는지 검증 — `..`로 버킷 경계를 빠져나가는 경로 차단
// (Upload/Download의 루트 탈출 방어만으로는 이웃 버킷 삭제가 가능했음, V1 리뷰).
func (l *localDiskStorage) Delete(_ context.Context, bucket, objectPath string) error {
	clean, err := l.cleanWithinBucket(bucket, objectPath)
	if err != nil {
		return err
	}
	return os.Remove(filepath.Join(l.dir, clean))
}

// Copy: 로컬 파일 복사. 경로 검증은 Delete와 동일 규칙(버킷 경계 포함)을 양쪽에 적용.
func (l *localDiskStorage) Copy(_ context.Context, srcBucket, srcKey, dstBucket, dstKey string) error {
	srcClean, err := l.cleanWithinBucket(srcBucket, srcKey)
	if err != nil {
		return err
	}
	dstClean, err := l.cleanWithinBucket(dstBucket, dstKey)
	if err != nil {
		return err
	}
	src, err := os.Open(filepath.Join(l.dir, srcClean))
	if err != nil {
		return err
	}
	defer src.Close()
	full := filepath.Join(l.dir, dstClean)
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	dst, err := os.Create(full)
	if err != nil {
		return err
	}
	defer dst.Close()
	_, err = io.Copy(dst, src)
	return err
}

// cleanWithinBucket: 빈 인자·루트 탈출·버킷 경계 탈출을 모두 차단한 정규화 경로 반환.
func (l *localDiskStorage) cleanWithinBucket(bucket, objectPath string) (string, error) {
	if bucket == "" || objectPath == "" {
		return "", fmt.Errorf("invalid object path")
	}
	clean := filepath.Clean(filepath.Join(bucket, objectPath))
	if clean == "." || strings.HasPrefix(clean, "..") || filepath.IsAbs(clean) ||
		!strings.HasPrefix(clean, bucket+string(os.PathSeparator)) {
		return "", fmt.Errorf("invalid object path")
	}
	return clean, nil
}

// NewServeUploadFile: 로컬 드라이버 한정 단일 파일 서빙 핸들러.
func NewServeUploadFile() http.HandlerFunc { return newServeUploadFileAt(localUploadDir) }

func newServeUploadFileAt(dir string) http.HandlerFunc {
	absDir, _ := filepath.Abs(dir)
	return func(w http.ResponseWriter, r *http.Request) {
		rel := strings.TrimPrefix(r.URL.Path, "/uploads/")
		clean := strings.TrimPrefix(filepath.Clean("/"+rel), "/") // / 기준 정규화로 .. 봉쇄
		if clean == "" || clean == "." || strings.Contains(clean, "..") {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		full := filepath.Join(dir, clean)
		absFull, _ := filepath.Abs(full)
		if absDir == "" || (absFull != absDir && !strings.HasPrefix(absFull, absDir+string(os.PathSeparator))) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		info, err := os.Stat(full)
		if err != nil || info.IsDir() {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		f, err := os.Open(full)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		defer f.Close()
		if ct := mime.TypeByExtension(filepath.Ext(full)); ct != "" {
			w.Header().Set("Content-Type", ct)
		}
		_, _ = io.Copy(w, f)
	}
}
