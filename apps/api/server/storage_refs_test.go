package api

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// DB 참조 형태 통일 (STORAGE.md "DB = object key, URL은 조회 시점에 만든다"):
//  - 쓰기: 우리 public 버킷의 절대 URL → object key로 정규화 (양형식 수용 — FE 무변경)
//  - 읽기: key → public URL 조립. 절대 URL(레거시 행·외부 참조)은 그대로 통과.

func refsServer() *Server {
	return &Server{
		UploadBucketPublic: "v3-uploads-public",
		SupabaseURL:        "https://x.supabase.co",
	}
}

func TestStorageKeyFromRef(t *testing.T) {
	s := refsServer()
	cases := []struct{ in, want string }{
		{"https://x.supabase.co/storage/v1/object/public/v3-uploads-public/v3-memory/L1/a.jpg", "v3-memory/L1/a.jpg"},
		{"v3-memory/L1/a.jpg", "v3-memory/L1/a.jpg"},                  // 이미 key
		{"https://cdn.example.com/x.jpg", "https://cdn.example.com/x.jpg"}, // 외부 — 통과
		{"", ""},
	}
	for _, c := range cases {
		if got := s.storageKeyFromRef(c.in); got != c.want {
			t.Errorf("storageKeyFromRef(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestStorageURLFromRef(t *testing.T) {
	s := refsServer()
	cases := []struct{ in, want string }{
		{"v3-memory/L1/a.jpg", "https://x.supabase.co/storage/v1/object/public/v3-uploads-public/v3-memory/L1/a.jpg"},
		{"https://anything/x.jpg", "https://anything/x.jpg"}, // 절대 URL — 통과 (레거시 행)
		{"", ""},
	}
	for _, c := range cases {
		if got := s.storageURLFromRef(c.in); got != c.want {
			t.Errorf("storageURLFromRef(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestNormalizeAndAssembleInvitationRefs(t *testing.T) {
	s := refsServer()
	urlOf := func(key string) string {
		return "https://x.supabase.co/storage/v1/object/public/v3-uploads-public/" + key
	}

	cover := urlOf("v3-mobile-invitation/W1/cover/a.jpg")
	gallery := []string{urlOf("v3-mobile-invitation/W1/gallery/b.png"), "https://cdn.example.com/keep.jpg"}
	var dc DesignConfig
	if err := json.Unmarshal([]byte(`{
		"canvas": {"items": [{"id":"i1","type":"image","image_url":"`+urlOf("v3-mobile-invitation/W1/canvas/c.webp")+`"}]},
		"lettering": {"image_url":"`+urlOf("v3-mobile-invitation/W1/lettering/d.svg")+`"}
	}`), &dc); err != nil {
		t.Fatal(err)
	}
	body := &UpdateInvitationRequest{CoverImage: &cover, GalleryPhotos: &gallery, DesignConfig: &dc}

	s.normalizeInvitationRefs(body)

	if *body.CoverImage != "v3-mobile-invitation/W1/cover/a.jpg" {
		t.Errorf("cover normalize: %s", *body.CoverImage)
	}
	if (*body.GalleryPhotos)[0] != "v3-mobile-invitation/W1/gallery/b.png" {
		t.Errorf("gallery normalize: %s", (*body.GalleryPhotos)[0])
	}
	if (*body.GalleryPhotos)[1] != "https://cdn.example.com/keep.jpg" {
		t.Errorf("외부 참조 변형: %s", (*body.GalleryPhotos)[1])
	}
	if got := *(*body.DesignConfig.Canvas.Items)[0].ImageUrl; got != "v3-mobile-invitation/W1/canvas/c.webp" {
		t.Errorf("canvas normalize: %s", got)
	}
	if got := *body.DesignConfig.Lettering.ImageUrl; got != "v3-mobile-invitation/W1/lettering/d.svg" {
		t.Errorf("lettering normalize: %s", got)
	}

	// 읽기: InvitationPublic에 key가 든 상태 → URL 조립
	pub := &InvitationPublic{
		CoverImage:    body.CoverImage,
		GalleryPhotos: body.GalleryPhotos,
		DesignConfig:  body.DesignConfig,
	}
	s.assembleInvitationPublicRefs(pub)
	if *pub.CoverImage != cover {
		t.Errorf("cover assemble: %s", *pub.CoverImage)
	}
	if (*pub.GalleryPhotos)[0] != urlOf("v3-mobile-invitation/W1/gallery/b.png") {
		t.Errorf("gallery assemble: %s", (*pub.GalleryPhotos)[0])
	}
	if got := *pub.DesignConfig.Lettering.ImageUrl; got != urlOf("v3-mobile-invitation/W1/lettering/d.svg") {
		t.Errorf("lettering assemble: %s", got)
	}
}

// 핸들러 통합: Update가 key로 저장하고 응답·조회는 URL로 돌려준다
func TestUpdateInvitation_StoresKeysAndRespondsURLs(t *testing.T) {
	s := refsServer()
	s.Uploader = &mockUploader{}
	var storedCover string
	s.Weddings = &mockWeddingService{
		IsHostFn: func(_ context.Context, _ openapi_types.UUID, _ pgtype.UUID) (bool, error) { return true, nil },
	}
	s.Invitations = &mockInvitationService{
		UpdateFn: func(_ context.Context, _ openapi_types.UUID, req *UpdateInvitationRequest) (*Invitation, error) {
			storedCover = *req.CoverImage // 호출 시점 값 캡처 (이후 assemble의 포인터 별칭 회피)
			c := *req.CoverImage
			return &Invitation{CoverImage: &c}, nil
		},
	}

	cover := "https://x.supabase.co/storage/v1/object/public/v3-uploads-public/v3-mobile-invitation/W1/cover/a.jpg"
	body := &UpdateInvitationRequest{CoverImage: &cover}
	uid := pgtype.UUID{Bytes: [16]byte{1}, Valid: true}

	resp, err := s.UpdateInvitation(withUserCtx(uid), UpdateInvitationRequestObject{
		WeddingId: openapi_types.UUID{1}, InvitationId: openapi_types.UUID{2}, Body: body,
	})
	if err != nil {
		t.Fatal(err)
	}
	if storedCover != "v3-mobile-invitation/W1/cover/a.jpg" {
		t.Errorf("stored cover = %q, want key", storedCover)
	}
	ok200, isOK := resp.(UpdateInvitation200JSONResponse)
	if !isOK {
		t.Fatalf("expected 200, got %T", resp)
	}
	if ok200.CoverImage == nil || !strings.HasPrefix(*ok200.CoverImage, "https://") {
		t.Errorf("response cover = %v, want assembled URL", ok200.CoverImage)
	}
}
