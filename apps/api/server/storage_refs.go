package api

import "strings"

// DB 참조 형태 통일 (STORAGE.md "DB = object key, URL은 조회 시점에 만든다").
//
//	쓰기 경계(핸들러): storageKeyFromRef — 우리 public 버킷의 절대 URL을 key로 정규화.
//	  양형식(URL·key) 수용이라 FE·계약 변경 없음. 외부 URL은 그대로 저장(통과).
//	읽기 경계(핸들러): storageURLFromRef — key를 public URL로 조립.
//	  절대 URL(레거시 행·외부 참조)은 그대로 통과 — 점진 이행 안전.
//
// 주의: API 핸들러를 거치지 않고 raw 행이 클라이언트에 닿는 경로(예: Supabase
// Realtime payload 직사용)가 생기면 key가 그대로 노출된다 — FE
// loungeV2Feed.feedPhotoUrl이 같은 규칙으로 조립하는 방어선을 유지한다.
// (현행 Realtime 훅은 invalidate만 하므로 실경로는 REST이며 서버가 전부 조립.)

func (s *Server) storageKeyFromRef(ref string) string {
	if ref == "" {
		return ref
	}
	marker := strings.TrimRight(s.SupabaseURL, "/") + "/storage/v1/object/public/" + s.UploadBucketPublic + "/"
	if strings.HasPrefix(ref, marker) {
		return strings.TrimPrefix(ref, marker)
	}
	return ref
}

func (s *Server) storageURLFromRef(ref string) string {
	if ref == "" || strings.Contains(ref, "://") {
		return ref
	}
	return s.publicURLForObject(s.UploadBucketPublic, ref)
}

// walkDesignConfigImageRefs: DesignConfig 안의 이미지 참조(canvas items·lettering)에
// 변환 함수를 적용. relocate의 순회와 동일 지점 (named type이라 모든 invitation 응답 공용).
func walkDesignConfigImageRefs(dc *DesignConfig, fn func(string) string) {
	if dc == nil {
		return
	}
	if dc.Canvas != nil && dc.Canvas.Items != nil {
		items := *dc.Canvas.Items
		for i := range items {
			if items[i].ImageUrl != nil && *items[i].ImageUrl != "" {
				*items[i].ImageUrl = fn(*items[i].ImageUrl)
			}
		}
	}
	if dc.Lettering != nil && dc.Lettering.ImageUrl != nil && *dc.Lettering.ImageUrl != "" {
		*dc.Lettering.ImageUrl = fn(*dc.Lettering.ImageUrl)
	}
}

func applyRefFn(cover *string, gallery *[]string, dc *DesignConfig, fn func(string) string) {
	if cover != nil && *cover != "" {
		*cover = fn(*cover)
	}
	if gallery != nil {
		g := *gallery
		for i := range g {
			if g[i] != "" {
				g[i] = fn(g[i])
			}
		}
	}
	walkDesignConfigImageRefs(dc, fn)
}

// 쓰기 경계 — URL→key 정규화.
func (s *Server) normalizeInvitationRefs(body *UpdateInvitationRequest) {
	if body == nil {
		return
	}
	applyRefFn(body.CoverImage, body.GalleryPhotos, body.DesignConfig, s.storageKeyFromRef)
}

func (s *Server) normalizeCreateInvitationRefs(body *CreateInvitationRequest) {
	if body == nil {
		return
	}
	applyRefFn(body.CoverImage, body.GalleryPhotos, body.DesignConfig, s.storageKeyFromRef)
}

// 읽기 경계 — key→URL 조립.
func (s *Server) assembleInvitationRefs(inv *Invitation) {
	if inv == nil {
		return
	}
	applyRefFn(inv.CoverImage, inv.GalleryPhotos, inv.DesignConfig, s.storageURLFromRef)
}

func (s *Server) assembleInvitationPublicRefs(pub *InvitationPublic) {
	if pub == nil {
		return
	}
	applyRefFn(pub.CoverImage, pub.GalleryPhotos, pub.DesignConfig, s.storageURLFromRef)
}
