package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// 시나리오 §11: private 카테고리의 presigned upload URL 만료 15분.
const presignedUploadTTLSec = 900

var (
	errPresignedBadRequest = errors.New("presigned: bad request")
	errPresignedForbidden  = errors.New("presigned: forbidden")
)

// invitation-draft 허용 확장자 — 이미지 + 레터링용 svg.
// (구 POST /uploads의 allow-list를 계승 — 해당 핸들러는 2026-06-10 폐기됨)
var draftAllowedExt = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true, ".svg": true,
}

// ── strict response 타입 (spec에 schema 없는 상태코드는 직접 구현) ──

type createPresignedUpload401 struct{}

func (createPresignedUpload401) VisitCreatePresignedUploadResponse(w http.ResponseWriter) error {
	w.WriteHeader(http.StatusUnauthorized)
	return nil
}

type createPresignedUpload400 struct{ detail string }

func (r createPresignedUpload400) VisitCreatePresignedUploadResponse(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	_, _ = fmt.Fprintf(w, `{"type":"about:blank","title":"Bad Request","status":400,"detail":%q}`, r.detail)
	return nil
}

type createPresignedUpload403 struct{ detail string }

func (r createPresignedUpload403) VisitCreatePresignedUploadResponse(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusForbidden)
	_, _ = fmt.Fprintf(w, `{"type":"about:blank","title":"Forbidden","status":403,"detail":%q}`, r.detail)
	return nil
}

// 503: 드라이버가 presigned 발급 미지원 (UPLOAD_DRIVER=local 등 dev fallback).
// 시나리오 §10·§12 인프라 액션 안내 — Supabase Storage 활성화 필요.
type createPresignedUpload503 struct{}

func (createPresignedUpload503) VisitCreatePresignedUploadResponse(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusServiceUnavailable)
	_, _ = fmt.Fprint(w, `{"type":"about:blank","title":"Service Unavailable","status":503,"detail":"presigned upload not supported by current driver (UPLOAD_DRIVER=local). Configure Supabase Storage + SUPABASE_SERVICE_ROLE_KEY."}`)
	return nil
}

// CreatePresignedUpload — 시나리오 §9-1 권한 매트릭스:
//   mobile-invitation : ctx user가 wedding owner (host_*_id 6개 중 매칭)
//   memory            : ctx user가 라운지에 입장 (v3_lounge_check_ins 존재)
//   share             : 입장 검증 + object_key의 {guestUserId}=ctx user 강제 주입
func (s *Server) CreatePresignedUpload(ctx context.Context, req CreatePresignedUploadRequestObject) (CreatePresignedUploadResponseObject, error) {
	userIDPg, ok := UserIDFromContext(ctx)
	if !ok {
		return createPresignedUpload401{}, nil
	}
	userID := openapi_types.UUID(userIDPg.Bytes)
	if req.Body == nil {
		return createPresignedUpload400{detail: "request body required"}, nil
	}
	body := *req.Body

	objectKey, bucket, isPublic, err := s.composePresignedObjectKey(ctx, userID, body)
	if err != nil {
		switch {
		case errors.Is(err, errPresignedBadRequest):
			return createPresignedUpload400{detail: err.Error()}, nil
		case errors.Is(err, errPresignedForbidden):
			return createPresignedUpload403{detail: err.Error()}, nil
		default:
			return nil, err
		}
	}

	uploadURL, err := s.Uploader.IssueSignedUploadURL(ctx, bucket, objectKey, body.MimeType, presignedUploadTTLSec)
	if err != nil {
		if errors.Is(err, ErrSignedUploadURLNotSupported) {
			return createPresignedUpload503{}, nil
		}
		return nil, err
	}
	resp := CreatePresignedUpload200JSONResponse{
		UploadUrl: uploadURL,
		ObjectKey: objectKey,
	}
	if isPublic {
		publicURL := s.publicURLForObject(bucket, objectKey)
		resp.PublicUrl = &publicURL
	}
	return resp, nil
}

// composePresignedObjectKey: 카테고리별로 (objectKey, bucket, isPublic) 반환.
// 청사진(faea79e): mobile-invitation → Public bucket (anon GET) / memory·share → Private bucket (signed URL GET).
func (s *Server) composePresignedObjectKey(ctx context.Context, userID openapi_types.UUID, body CreatePresignedUploadRequest) (string, string, bool, error) {
	ext := strings.ToLower(filepath.Ext(body.FileName))
	if ext == "" {
		ext = ".bin"
	}
	objID := uuid.NewString()

	switch body.Category {
	case CreatePresignedUploadRequestCategoryMobileInvitation:
		if body.WeddingId == nil || body.InvitationId == nil || body.SubKind == nil {
			return "", "", false, fmt.Errorf("%w: mobile-invitation requires wedding_id, invitation_id, sub_kind", errPresignedBadRequest)
		}
		if !s.userIsWeddingOwner(ctx, *body.WeddingId, userID) {
			return "", "", false, fmt.Errorf("%w: not a wedding owner", errPresignedForbidden)
		}
		sub := string(*body.SubKind)
		key := fmt.Sprintf("v3-mobile-invitation/%s/%s/%s%s", body.WeddingId.String(), sub, objID, ext)
		return key, s.UploadBucketPublic, true, nil

	case CreatePresignedUploadRequestCategoryMemory:
		if body.LoungeId == nil {
			return "", "", false, fmt.Errorf("%w: memory requires lounge_id", errPresignedBadRequest)
		}
		if !s.userIsLoungeEntrant(ctx, *body.LoungeId, userID) {
			return "", "", false, fmt.Errorf("%w: not a lounge entrant", errPresignedForbidden)
		}
		// 온기 사진은 public 버킷 — 라운지 피드(FeedCardModal)가 URL 직참조로 렌더하고
		// 기존 v3_memories.photo_url 데이터가 전부 절대 public URL이라 호환 유지.
		// private(signed URL) 전환은 만료 갱신·레거시 행 이관이 얽힌 별도 제품 결정 (2026-06-10 보류).
		key := fmt.Sprintf("v3-memory/%s/%s%s", body.LoungeId.String(), objID, ext)
		return key, s.UploadBucketPublic, true, nil

	case CreatePresignedUploadRequestCategoryInvitationDraft:
		// Create 흐름(wedding 미존재) 임시 업로드 — 인증만으로 발급되므로
		// 허용 확장자 제한(임의 .html/.js public 호스팅 차단). svg는 레터링이 필요로
		// 하며 wedding 카테고리는 원래 무검사라 노출 등급이 같다.
		// 저장 확정 시 updateInvitation이 v3-tmp/* key를 wedding 경로로 이동(copy+delete),
		// 미저장 잔여물은 sweep이 정리. 설계: _architecture/2026-06-10-invitation-draft-upload.md
		if !draftAllowedExt[ext] {
			return "", "", false, fmt.Errorf("%w: unsupported file extension %q", errPresignedBadRequest, ext)
		}
		key := fmt.Sprintf("v3-tmp/%s/%s%s", userID.String(), objID, ext)
		return key, s.UploadBucketPublic, true, nil

	case CreatePresignedUploadRequestCategoryShare:
		if body.LoungeId == nil {
			return "", "", false, fmt.Errorf("%w: share requires lounge_id", errPresignedBadRequest)
		}
		if !s.userIsLoungeEntrant(ctx, *body.LoungeId, userID) {
			return "", "", false, fmt.Errorf("%w: not a lounge entrant", errPresignedForbidden)
		}
		// guestUserId = ctx user 강제 (다른 사용자 폴더 시도 차단)
		key := fmt.Sprintf("v3-share/%s/%s/%s%s", body.LoungeId.String(), userID.String(), objID, ext)
		return key, s.UploadBucketPrivate, false, nil

	default:
		return "", "", false, fmt.Errorf("%w: unknown category %q", errPresignedBadRequest, body.Category)
	}
}

func (s *Server) userIsWeddingOwner(ctx context.Context, weddingID, userID openapi_types.UUID) bool {
	if s.Pool == nil {
		return false
	}
	var count int
	err := s.Pool.QueryRow(ctx, `
        SELECT count(*) FROM v3_weddings WHERE id=$1 AND (
            host_groom_id=$2 OR host_bride_id=$2 OR
            host_groom_father_id=$2 OR host_groom_mother_id=$2 OR
            host_bride_father_id=$2 OR host_bride_mother_id=$2
        )`, pgtype.UUID{Bytes: weddingID, Valid: true}, pgtype.UUID{Bytes: userID, Valid: true}).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}

func (s *Server) userIsLoungeEntrant(ctx context.Context, loungeID, userID openapi_types.UUID) bool {
	if s.Pool == nil {
		return false
	}
	var count int
	err := s.Pool.QueryRow(ctx, `
        SELECT count(*) FROM v3_lounge_check_ins WHERE lounge_id=$1 AND user_id=$2`,
		pgtype.UUID{Bytes: loungeID, Valid: true}, pgtype.UUID{Bytes: userID, Valid: true}).Scan(&count)
	if err != nil {
		return false
	}
	return count > 0
}

func (s *Server) publicURLForObject(bucket, objectKey string) string {
	base := strings.TrimRight(s.SupabaseURL, "/")
	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", base, bucket, objectKey)
}
