package api

import (
	"context"
	"fmt"
	"log"
	"path"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// 저장 확정 시 draft(v3-tmp) 이미지를 wedding 경로로 이동.
// 설계: _architecture/2026-06-10-invitation-draft-upload.md (A안)
//   copy → 참조 재작성 → (Update 성공 후) tmp 원본 best-effort 삭제.
//
// 안전 규칙 (V2 리뷰):
//  - 본인 폴더(v3-tmp/{ctx userID}/)의 key만 이동 — 타인 tmp 참조는 무시(원본 유지).
//  - dstKey는 호출마다 새 uuid — 재시도 시 동일 목적지 충돌로 실패하지 않게(멱등).
//    이전 시도의 사본은 미참조 고아로 남아 참조 대조 sweep이 정리한다.
//  - copy 실패 항목은 원본 참조 유지 — DB가 tmp를 계속 참조하는 동안
//    참조 대조 sweep이 그 객체를 보존하므로 이미지가 깨지지 않는다.

const draftTmpPrefix = "v3-tmp/"

// draftTmpKey: ref가 본인 소유 v3-tmp object key 또는 그 public URL이면 key를 돌려준다.
// FE 현행 패턴상 절대 URL 형태로 올 수 있어 두 형태 모두 감지 (V1 리뷰).
func (s *Server) draftTmpKey(ref, ownerPrefix string) (string, bool) {
	if strings.HasPrefix(ref, ownerPrefix) {
		return ref, true
	}
	marker := "/storage/v1/object/public/" + s.UploadBucketPublic + "/"
	if i := strings.Index(ref, marker); i >= 0 {
		key := ref[i+len(marker):]
		if strings.HasPrefix(key, ownerPrefix) {
			return key, true
		}
	}
	return "", false
}

// relocateOne: 본인 tmp ref면 wedding 경로로 copy하고 (새 public URL, tmp key, true) 반환.
// tmp가 아니거나(타인 폴더 포함) copy 실패면 ok=false (호출자는 원본 유지).
func (s *Server) relocateOne(ctx context.Context, ownerPrefix, widStr, subKind, ref string) (string, string, bool) {
	key, isTmp := s.draftTmpKey(ref, ownerPrefix)
	if !isTmp {
		return "", "", false
	}
	ext := strings.ToLower(path.Ext(key))
	dstKey := fmt.Sprintf("v3-mobile-invitation/%s/%s/%s%s", widStr, subKind, uuid.NewString(), ext)
	if err := s.Uploader.Copy(ctx, s.UploadBucketPublic, key, s.UploadBucketPublic, dstKey); err != nil {
		log.Printf("draft relocate: copy %s → %s 실패(원본 유지): %v", key, dstKey, err)
		return "", "", false
	}
	return s.publicURLForObject(s.UploadBucketPublic, dstKey), key, true
}

// relocateInvitationDraftRefs: body의 cover/gallery/canvas/lettering 참조에서 본인 소유
// v3-tmp를 감지해 wedding 경로로 이동(copy+참조 재작성)하고, 삭제할 tmp key 목록을 반환.
// 호출자는 저장(Update) 성공 후에만 tmp를 삭제한다 — 실패 시 원본이 살아 있어야 함.
func (s *Server) relocateInvitationDraftRefs(ctx context.Context, userID pgtype.UUID, weddingID openapi_types.UUID, body *UpdateInvitationRequest) []string {
	if body == nil || s.Uploader == nil {
		return nil
	}
	ownerPrefix := draftTmpPrefix + openapi_types.UUID(userID.Bytes).String() + "/"
	widStr := weddingID.String()
	var tmpKeys []string

	if body.CoverImage != nil {
		if newRef, key, ok := s.relocateOne(ctx, ownerPrefix, widStr, "cover", *body.CoverImage); ok {
			*body.CoverImage = newRef
			tmpKeys = append(tmpKeys, key)
		}
	}
	if body.GalleryPhotos != nil {
		g := *body.GalleryPhotos
		for i := range g {
			if newRef, key, ok := s.relocateOne(ctx, ownerPrefix, widStr, "gallery", g[i]); ok {
				g[i] = newRef
				tmpKeys = append(tmpKeys, key)
			}
		}
	}
	if dc := body.DesignConfig; dc != nil {
		if dc.Canvas != nil && dc.Canvas.Items != nil {
			items := *dc.Canvas.Items
			for i := range items {
				if items[i].ImageUrl == nil {
					continue
				}
				if newRef, key, ok := s.relocateOne(ctx, ownerPrefix, widStr, "canvas", *items[i].ImageUrl); ok {
					*items[i].ImageUrl = newRef
					tmpKeys = append(tmpKeys, key)
				}
			}
		}
		if dc.Lettering != nil && dc.Lettering.ImageUrl != nil {
			if newRef, key, ok := s.relocateOne(ctx, ownerPrefix, widStr, "lettering", *dc.Lettering.ImageUrl); ok {
				*dc.Lettering.ImageUrl = newRef
				tmpKeys = append(tmpKeys, key)
			}
		}
	}
	return tmpKeys
}

// cleanupDraftTmp: Update 성공 후 tmp 원본 best-effort 삭제.
// 실패는 로그만 — 잔여물은 sweep 몫 (404 포함 모든 에러 무시 가능).
func (s *Server) cleanupDraftTmp(ctx context.Context, tmpKeys []string) {
	for _, k := range tmpKeys {
		if err := s.Uploader.Delete(ctx, s.UploadBucketPublic, k); err != nil {
			log.Printf("draft relocate: tmp 삭제 실패(sweep 대상으로 잔존) %s: %v", k, err)
		}
	}
}
