package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Supabase Storage 객체 삭제:
//   DELETE /storage/v1/object/{bucket}/{path} (service_role bearer)
// 이관(tmp 정리)·고아 sweep의 전제 능력 (STORAGE.md "정리는 서버 몫").
func TestSupabaseStorage_Delete_Happy(t *testing.T) {
	var (
		gotMethod string
		gotPath   string
		gotAuth   string
	)
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
	}))
	defer ts.Close()

	s := NewSupabaseStorage(ts.URL, "svc-key")
	err := s.Delete(context.Background(), "v3-uploads-public", "v3-tmp/U1/x.jpg")
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if gotMethod != http.MethodDelete {
		t.Errorf("method = %s, want DELETE", gotMethod)
	}
	if !strings.HasSuffix(gotPath, "/storage/v1/object/v3-uploads-public/v3-tmp/U1/x.jpg") {
		t.Errorf("path = %s", gotPath)
	}
	if gotAuth != "Bearer svc-key" {
		t.Errorf("auth = %s, want Bearer svc-key", gotAuth)
	}
}

func TestSupabaseStorage_Delete_ServerError(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer ts.Close()

	s := NewSupabaseStorage(ts.URL, "k")
	if err := s.Delete(context.Background(), "b", "p"); err == nil {
		t.Fatal("want err, got nil")
	}
}

func TestLocalDiskStorage_Delete_RemovesFile(t *testing.T) {
	dir := t.TempDir()
	l := newLocalDiskStorageAt(dir)
	if _, err := l.Upload(context.Background(), "bkt", "u1/a.jpg", "image/jpeg", strings.NewReader("x")); err != nil {
		t.Fatalf("setup upload: %v", err)
	}
	full := filepath.Join(dir, "bkt", "u1", "a.jpg")
	if _, err := os.Stat(full); err != nil {
		t.Fatalf("setup file missing: %v", err)
	}

	if err := l.Delete(context.Background(), "bkt", "u1/a.jpg"); err != nil {
		t.Fatalf("delete err: %v", err)
	}
	if _, err := os.Stat(full); !os.IsNotExist(err) {
		t.Errorf("file still exists (or stat err): %v", err)
	}
}

// 가드 거부(ENOENT가 아니라)임을 보장 — 탈출 대상 파일을 실제로 만들어 두고
// 삭제되지 않음 + "invalid object path" 에러를 확인 (V1 리뷰: 거짓 통과 방지)
func TestLocalDiskStorage_Delete_RejectsTraversalAndEmpty(t *testing.T) {
	dir := t.TempDir()
	l := newLocalDiskStorageAt(dir)
	// 버킷 경계 탈출 표적: bkt 밖(루트 직하·이웃 버킷)에 미끼 파일 배치
	decoyRoot := filepath.Join(dir, "escape.jpg")
	decoyOther := filepath.Join(dir, "other-bucket", "x.jpg")
	if err := os.MkdirAll(filepath.Dir(decoyOther), 0o755); err != nil {
		t.Fatal(err)
	}
	for _, p := range []string{decoyRoot, decoyOther} {
		if err := os.WriteFile(p, []byte("decoy"), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	cases := []struct{ bucket, path string }{
		{"bkt", "../escape.jpg"},        // 버킷 밖 루트로 탈출 시도
		{"bkt", "../other-bucket/x.jpg"}, // 이웃 버킷으로 탈출 시도
		{"..", "x.jpg"},
		{"bkt", ""},
		{"", ""},
	}
	for _, c := range cases {
		err := l.Delete(context.Background(), c.bucket, c.path)
		if err == nil {
			t.Errorf("bucket=%q path=%q: want err, got nil", c.bucket, c.path)
			continue
		}
		if !strings.Contains(err.Error(), "invalid object path") {
			t.Errorf("bucket=%q path=%q: want guard error, got %v", c.bucket, c.path, err)
		}
	}
	for _, p := range []string{decoyRoot, decoyOther} {
		if _, err := os.Stat(p); err != nil {
			t.Errorf("decoy %s was deleted or unreadable: %v", p, err)
		}
	}
}

func TestSupabaseStorage_Delete_RejectsEmptyArgs(t *testing.T) {
	s := NewSupabaseStorage("https://x.supabase.co", "k")
	for _, c := range []struct{ bucket, path string }{{"", "p"}, {"b", ""}, {"", ""}} {
		if err := s.Delete(context.Background(), c.bucket, c.path); err == nil {
			t.Errorf("bucket=%q path=%q: want err, got nil", c.bucket, c.path)
		}
	}
}
