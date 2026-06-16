package api

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// 저장 확정 시 v3-tmp(draft) 참조를 wedding 경로로 이동 (copy → 참조 재작성 → tmp 삭제).
// 설계: _architecture/2026-06-10-invitation-draft-upload.md (A안)
//  - 참조는 object key·절대 public URL 두 형태 모두 감지 (V1 리뷰)
//  - 본인 폴더(v3-tmp/{userID}/)만 이동 — 타인 tmp는 무시 (V2 리뷰)
//  - dstKey는 호출마다 새 uuid — 재시도 멱등 (V2 리뷰)
//  - copy 실패 항목은 원본 참조 유지 (sweep이 참조 객체를 보존하므로 안전)

const relocSupabaseURL = "https://x.supabase.co"

var relocUID = pgtype.UUID{Bytes: [16]byte{0xAA, 0xBB}, Valid: true}

const relocUIDStr = "aabb0000-0000-0000-0000-000000000000"

func relocServer(up *mockUploader) *Server {
	return &Server{
		Uploader:           up,
		UploadBucketPublic: "v3-uploads-public",
		SupabaseURL:        relocSupabaseURL,
	}
}

func relocBody(t *testing.T) *UpdateInvitationRequest {
	t.Helper()
	cover := relocSupabaseURL + "/storage/v1/object/public/v3-uploads-public/v3-tmp/" + relocUIDStr + "/aaa.jpg"
	gallery := []string{
		"v3-tmp/" + relocUIDStr + "/bbb.png", // object key 형태
		"https://cdn.example.com/keep.jpg",
	}
	var dc DesignConfig
	if err := json.Unmarshal([]byte(`{
		"canvas": {"items": [
			{"id": "i1", "type": "image", "image_url": "v3-tmp/`+relocUIDStr+`/ccc.webp"},
			{"id": "i2", "type": "text", "text": "hello"}
		]},
		"lettering": {"image_url": "`+relocSupabaseURL+`/storage/v1/object/public/v3-uploads-public/v3-tmp/`+relocUIDStr+`/ddd.png"}
	}`), &dc); err != nil {
		t.Fatalf("fixture: %v", err)
	}
	return &UpdateInvitationRequest{
		CoverImage:    &cover,
		GalleryPhotos: &gallery,
		DesignConfig:  &dc,
	}
}

// 재작성 결과 패턴: .../v3-mobile-invitation/{wid}/{subKind}/{uuid}{ext}
func assertRelocated(t *testing.T, got, widStr, subKind, ext string) {
	t.Helper()
	pattern := regexp.QuoteMeta(
		relocSupabaseURL+"/storage/v1/object/public/v3-uploads-public/v3-mobile-invitation/"+widStr+"/"+subKind+"/",
	) + `[0-9a-f-]{36}` + regexp.QuoteMeta(ext) + `$`
	if !regexp.MustCompile(pattern).MatchString(got) {
		t.Errorf("relocated ref = %s, want pattern %s", got, pattern)
	}
}

func TestRelocateInvitationDraftRefs_RewritesAndCollects(t *testing.T) {
	up := &mockUploader{}
	s := relocServer(up)
	body := relocBody(t)
	wid := openapi_types.UUID{1, 2, 3, 4}

	tmpKeys := s.relocateInvitationDraftRefs(context.Background(), relocUID, wid, body)

	widStr := wid.String()
	assertRelocated(t, *body.CoverImage, widStr, "cover", ".jpg")
	assertRelocated(t, (*body.GalleryPhotos)[0], widStr, "gallery", ".png")
	if (*body.GalleryPhotos)[1] != "https://cdn.example.com/keep.jpg" {
		t.Errorf("gallery[1] (non-tmp) modified: %s", (*body.GalleryPhotos)[1])
	}
	items := *body.DesignConfig.Canvas.Items
	assertRelocated(t, *items[0].ImageUrl, widStr, "canvas", ".webp")
	if items[1].ImageUrl != nil {
		t.Errorf("text item gained image_url: %v", *items[1].ImageUrl)
	}
	assertRelocated(t, *body.DesignConfig.Lettering.ImageUrl, widStr, "lettering", ".png")

	if len(tmpKeys) != 4 {
		t.Errorf("tmpKeys = %v, want 4 entries", tmpKeys)
	}
	if len(up.copiedPairs) != 4 {
		t.Errorf("copiedPairs = %v, want 4", up.copiedPairs)
	}
	for _, pair := range up.copiedPairs {
		if !strings.HasPrefix(pair.srcKey, "v3-tmp/"+relocUIDStr+"/") {
			t.Errorf("copy src = %s, want 본인 tmp 폴더", pair.srcKey)
		}
		if pair.srcBucket != "v3-uploads-public" || pair.dstBucket != "v3-uploads-public" {
			t.Errorf("copy buckets = %s→%s, want public→public", pair.srcBucket, pair.dstBucket)
		}
	}
}

// 타인 폴더의 tmp 참조는 이동·삭제 대상이 아니다 (소유자 검증, V2 리뷰)
func TestRelocateInvitationDraftRefs_IgnoresForeignTmp(t *testing.T) {
	up := &mockUploader{}
	s := relocServer(up)
	foreign := "v3-tmp/99999999-0000-0000-0000-000000000000/steal.jpg"
	body := &UpdateInvitationRequest{CoverImage: &foreign}

	tmpKeys := s.relocateInvitationDraftRefs(context.Background(), relocUID, openapi_types.UUID{9}, body)

	if *body.CoverImage != foreign {
		t.Errorf("foreign tmp modified: %s", *body.CoverImage)
	}
	if len(tmpKeys) != 0 || len(up.copiedPairs) != 0 {
		t.Errorf("foreign tmp copied/collected: keys=%v copies=%v", tmpKeys, up.copiedPairs)
	}
}

func TestRelocateInvitationDraftRefs_CopyFailureKeepsOriginal(t *testing.T) {
	up := &mockUploader{copyErr: errors.New("copy boom")}
	s := relocServer(up)
	body := relocBody(t)
	orig := *body.CoverImage

	tmpKeys := s.relocateInvitationDraftRefs(context.Background(), relocUID, openapi_types.UUID{9}, body)

	if *body.CoverImage != orig {
		t.Errorf("cover modified despite copy failure: %s", *body.CoverImage)
	}
	if len(tmpKeys) != 0 {
		t.Errorf("tmpKeys = %v, want empty on failure", tmpKeys)
	}
}

// 핸들러 통합: UpdateInvitation이 이동 후 tmp 원본을 best-effort 삭제한다
func TestUpdateInvitation_RelocatesDraftAndDeletesTmp(t *testing.T) {
	up := &mockUploader{}
	var gotUpdateBody *UpdateInvitationRequest
	s := relocServer(up)
	s.Weddings = &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) {
			return true, nil
		},
	}
	s.Invitations = &mockInvitationService{
		UpdateFn: func(_ context.Context, _ openapi_types.UUID, req *UpdateInvitationRequest) (*Invitation, error) {
			gotUpdateBody = req
			return &Invitation{}, nil
		},
	}

	body := relocBody(t)
	wid := openapi_types.UUID{5, 5}
	resp, err := s.UpdateInvitation(withUserCtx(relocUID), UpdateInvitationRequestObject{
		WeddingId:    wid,
		InvitationId: openapi_types.UUID{6, 6},
		Body:         body,
	})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if _, ok := resp.(UpdateInvitation200JSONResponse); !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	// 이동(relocate) 후 정규화(normalize)까지 거치므로 Update에는 wedding 스코프 key가 도달
	if gotUpdateBody == nil || !strings.Contains(*gotUpdateBody.CoverImage, "v3-mobile-invitation/") {
		t.Errorf("Update received non-relocated cover: %+v", gotUpdateBody.CoverImage)
	}
	if len(up.deletedPaths) != 4 {
		t.Errorf("deletedPaths = %v, want 4 tmp originals", up.deletedPaths)
	}
}
