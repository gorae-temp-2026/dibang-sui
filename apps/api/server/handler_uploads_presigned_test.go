package api

import (
	"context"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// withUserCtx: 같은 패키지라 userIDContextKey 직접 사용 가능.
func withUserCtx(uid pgtype.UUID) context.Context {
	return context.WithValue(context.Background(), userIDContextKey, uid)
}

// 인증 컨텍스트 부재 → 401
func TestCreatePresignedUpload_Unauthorized(t *testing.T) {
	srv := &Server{Uploader: &mockUploader{}}
	body := CreatePresignedUploadRequest{
		Category: CreatePresignedUploadRequestCategoryMobileInvitation,
		FileName: "x.jpg",
		MimeType: "image/jpeg",
	}
	resp, err := srv.CreatePresignedUpload(context.Background(), CreatePresignedUploadRequestObject{Body: &body})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if _, ok := resp.(createPresignedUpload401); !ok {
		t.Errorf("expected createPresignedUpload401, got %T", resp)
	}
}

// 본문 nil → 400
func TestCreatePresignedUpload_BadRequest_NilBody(t *testing.T) {
	srv := &Server{Uploader: &mockUploader{}}
	uid := pgtype.UUID{Bytes: [16]byte{1, 2, 3, 4}, Valid: true}
	resp, err := srv.CreatePresignedUpload(withUserCtx(uid), CreatePresignedUploadRequestObject{Body: nil})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if _, ok := resp.(createPresignedUpload400); !ok {
		t.Errorf("expected 400, got %T", resp)
	}
}

// category별 필수 필드 누락 → 400
func TestCreatePresignedUpload_BadRequest_MissingRequiredFields(t *testing.T) {
	srv := &Server{Uploader: &mockUploader{}}
	uid := pgtype.UUID{Bytes: [16]byte{1}, Valid: true}
	ctx := withUserCtx(uid)

	cases := []struct {
		name string
		body CreatePresignedUploadRequest
	}{
		{"mobile-invitation without wedding_id", CreatePresignedUploadRequest{Category: CreatePresignedUploadRequestCategoryMobileInvitation, FileName: "x.jpg", MimeType: "image/jpeg"}},
		{"memory without lounge_id", CreatePresignedUploadRequest{Category: CreatePresignedUploadRequestCategoryMemory, FileName: "x.jpg", MimeType: "image/jpeg"}},
		{"share without lounge_id", CreatePresignedUploadRequest{Category: CreatePresignedUploadRequestCategoryShare, FileName: "x.jpg", MimeType: "image/jpeg"}},
	}
	for _, c := range cases {
		resp, err := srv.CreatePresignedUpload(ctx, CreatePresignedUploadRequestObject{Body: &c.body})
		if err != nil {
			t.Fatalf("%s err: %v", c.name, err)
		}
		if _, ok := resp.(createPresignedUpload400); !ok {
			t.Errorf("%s: expected 400, got %T", c.name, resp)
		}
	}
}

// Pool=nil → userIs*Owner/Entrant 모두 false → 403
// (실제 DB 검증은 T-09 통합 테스트에서 보완)
func TestCreatePresignedUpload_Forbidden_WhenPoolNil(t *testing.T) {
	srv := &Server{Uploader: &mockUploader{}, Pool: nil}
	uid := pgtype.UUID{Bytes: [16]byte{1}, Valid: true}
	ctx := withUserCtx(uid)
	weddingID := openapi_types.UUID{1, 2, 3}
	invID := openapi_types.UUID{7, 8, 9}
	loungeID := openapi_types.UUID{4, 5, 6}

	cases := []CreatePresignedUploadRequest{
		// mobile-invitation: 필수 다 갖추되 Pool=nil이라 owner 검증 false
		{
			Category:     CreatePresignedUploadRequestCategoryMobileInvitation,
			WeddingId:    &weddingID,
			InvitationId: &invID,
			SubKind:      ptrSubKind(CreatePresignedUploadRequestSubKind("cover")),
			FileName:     "x.jpg",
			MimeType:     "image/jpeg",
		},
		// memory
		{Category: CreatePresignedUploadRequestCategoryMemory, LoungeId: &loungeID, FileName: "x.jpg", MimeType: "image/jpeg"},
		// share
		{Category: CreatePresignedUploadRequestCategoryShare, LoungeId: &loungeID, FileName: "x.jpg", MimeType: "image/jpeg"},
	}
	for i, c := range cases {
		resp, err := srv.CreatePresignedUpload(ctx, CreatePresignedUploadRequestObject{Body: &c})
		if err != nil {
			t.Fatalf("case %d err: %v", i, err)
		}
		if _, ok := resp.(createPresignedUpload403); !ok {
			t.Errorf("case %d (%s): expected 403, got %T", i, c.Category, resp)
		}
	}
}

func ptrSubKind(v CreatePresignedUploadRequestSubKind) *CreatePresignedUploadRequestSubKind {
	return &v
}

// invitation-draft: wedding 미존재 시점(Create 흐름) 업로드 — 인증만으로 발급,
// 경로는 v3-tmp/{userID}/ 프리픽스 + public bucket (설계: _architecture/2026-06-10-invitation-draft-upload.md)
func TestCreatePresignedUpload_InvitationDraft_Success(t *testing.T) {
	up := &mockUploader{signedURL: "https://x.supabase.co/storage/v1/object/upload/sign/tok"}
	srv := &Server{
		Uploader:           up,
		UploadBucketPublic: "v3-uploads-public",
		SupabaseURL:        "https://x.supabase.co",
	}
	uid := pgtype.UUID{Bytes: [16]byte{0xAA, 0xBB}, Valid: true}
	body := CreatePresignedUploadRequest{
		Category: CreatePresignedUploadRequestCategoryInvitationDraft,
		FileName: "cover.jpg",
		MimeType: "image/jpeg",
	}

	resp, err := srv.CreatePresignedUpload(withUserCtx(uid), CreatePresignedUploadRequestObject{Body: &body})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	ok200, isOK := resp.(CreatePresignedUpload200JSONResponse)
	if !isOK {
		t.Fatalf("expected 200, got %T", resp)
	}
	wantPrefix := "v3-tmp/aabb0000-0000-0000-0000-000000000000/"
	if !strings.HasPrefix(ok200.ObjectKey, wantPrefix) {
		t.Errorf("object_key prefix: want %q, got %q", wantPrefix, ok200.ObjectKey)
	}
	if !strings.HasSuffix(ok200.ObjectKey, ".jpg") {
		t.Errorf("object_key ext: want .jpg suffix, got %q", ok200.ObjectKey)
	}
	if up.signedGotBucket != "v3-uploads-public" {
		t.Errorf("bucket: want v3-uploads-public, got %q", up.signedGotBucket)
	}
	if ok200.PublicUrl == nil {
		t.Error("public_url: want non-nil for public bucket draft")
	}
}

// invitation-draft: 이미지 외 확장자는 발급 거부 — 인증만으로 public 버킷에
// 임의 파일(.html 등) 호스팅되는 것 차단 (V1 리뷰)
func TestCreatePresignedUpload_InvitationDraft_RejectsNonImageExt(t *testing.T) {
	srv := &Server{
		Uploader:           &mockUploader{signedURL: "https://x/sign"},
		UploadBucketPublic: "v3-uploads-public",
		SupabaseURL:        "https://x.supabase.co",
	}
	uid := pgtype.UUID{Bytes: [16]byte{1}, Valid: true}
	for _, name := range []string{"evil.html", "script.js", "noext"} {
		body := CreatePresignedUploadRequest{
			Category: CreatePresignedUploadRequestCategoryInvitationDraft,
			FileName: name,
			MimeType: "text/html",
		}
		resp, err := srv.CreatePresignedUpload(withUserCtx(uid), CreatePresignedUploadRequestObject{Body: &body})
		if err != nil {
			t.Fatalf("%s err: %v", name, err)
		}
		if _, ok := resp.(createPresignedUpload400); !ok {
			t.Errorf("%s: expected 400, got %T", name, resp)
		}
	}
}

// mobile-invitation sub_kind=canvas: enum이 계약에 존재해 400이 아닌 owner 검증(403, Pool=nil)까지 도달
func TestCreatePresignedUpload_MobileInvitation_CanvasSubKind_ReachesOwnerCheck(t *testing.T) {
	srv := &Server{Uploader: &mockUploader{}, Pool: nil}
	uid := pgtype.UUID{Bytes: [16]byte{1}, Valid: true}
	weddingID := openapi_types.UUID{1}
	invID := openapi_types.UUID{2}
	body := CreatePresignedUploadRequest{
		Category:     CreatePresignedUploadRequestCategoryMobileInvitation,
		WeddingId:    &weddingID,
		InvitationId: &invID,
		SubKind:      ptrSubKind(CreatePresignedUploadRequestSubKindCanvas),
		FileName:     "drawing.png",
		MimeType:     "image/png",
	}

	resp, err := srv.CreatePresignedUpload(withUserCtx(uid), CreatePresignedUploadRequestObject{Body: &body})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if _, ok := resp.(createPresignedUpload403); !ok {
		t.Errorf("expected 403 (owner check reached), got %T", resp)
	}
}
