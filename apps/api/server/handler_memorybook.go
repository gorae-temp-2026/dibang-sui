package api

import (
	"context"
	"errors"
	"net/http"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

// _scenario/wedding-memorybook-2026-05-24/SCENARIOS.md §A·§B·§E.
// 6슬롯 호스트 권한은 s.Weddings.IsHost가 처리. 미인증/비호스트는 모두 403.

const maxMemoryBookCurationPhotos = 30

// GetWeddingMemoryBook (GET /weddings/{weddingId}/memory-book): S-06.
func (s *Server) GetWeddingMemoryBook(ctx context.Context, req GetWeddingMemoryBookRequestObject) (GetWeddingMemoryBookResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return GetWeddingMemoryBook403JSONResponse{forbidden("authentication required")}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return GetWeddingMemoryBook404JSONResponse{notFound("wedding not found")}, nil
		}
		return nil, err
	}
	if !isHost {
		return GetWeddingMemoryBook403JSONResponse{forbidden("not a host of this wedding")}, nil
	}

	resp, err := s.MemoryBook.Get(ctx, req.WeddingId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return GetWeddingMemoryBook404JSONResponse{notFound("wedding not found")}, nil
		}
		return nil, err
	}
	// 청첩장 cover·gallery 유래 참조는 DB에 object key — 조회 시 URL 조립 (STORAGE.md)
	if resp.Data != nil {
		if resp.Data.Couple.CoverPhotoUrl != nil {
			*resp.Data.Couple.CoverPhotoUrl = s.storageURLFromRef(*resp.Data.Couple.CoverPhotoUrl)
		}
		for i := range resp.Data.DisplayPhotos {
			resp.Data.DisplayPhotos[i] = s.storageURLFromRef(resp.Data.DisplayPhotos[i])
		}
	}
	return GetWeddingMemoryBook200JSONResponse(*resp), nil
}

// ReplaceWeddingMemoryBookPhotos (PUT /weddings/{weddingId}/memory-book/photos): S-04, S-05.
func (s *Server) ReplaceWeddingMemoryBookPhotos(ctx context.Context, req ReplaceWeddingMemoryBookPhotosRequestObject) (ReplaceWeddingMemoryBookPhotosResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return replaceMemoryBookPhotosForbidden("authentication required"), nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return replaceMemoryBookPhotosNotFound(), nil
		}
		return nil, err
	}
	if !isHost {
		return replaceMemoryBookPhotosForbidden("not a host of this wedding"), nil
	}

	if req.Body == nil {
		return replaceMemoryBookPhotosBadRequest("photo_ids required", nil), nil
	}
	photoIDs := req.Body.PhotoIds
	if len(photoIDs) > maxMemoryBookCurationPhotos {
		return replaceMemoryBookPhotosBadRequest("max 30 photos", nil), nil
	}

	result, err := s.MemoryBook.ReplacePhotos(ctx, req.WeddingId, photoIDs, userID)
	if err != nil {
		if errors.Is(err, ErrDuplicatePhotoID) {
			return replaceMemoryBookPhotosBadRequest("duplicate photo_id", nil), nil
		}
		return nil, err
	}
	if len(result.InvalidIDs) > 0 {
		return replaceMemoryBookPhotosBadRequest("some photo_ids are not shared photos of this wedding", result.InvalidIDs), nil
	}
	return ReplaceWeddingMemoryBookPhotos200JSONResponse{
		Ok:    true,
		Count: result.Count,
	}, nil
}

// ── 응답 헬퍼들 (oapi-codegen 생성 응답 타입을 단순화) ────────────────────

func replaceMemoryBookPhotosForbidden(detail string) replaceMemoryBookPhotosForbiddenResp {
	return replaceMemoryBookPhotosForbiddenResp{detail: detail}
}

type replaceMemoryBookPhotosForbiddenResp struct{ detail string }

func (r replaceMemoryBookPhotosForbiddenResp) VisitReplaceWeddingMemoryBookPhotosResponse(w http.ResponseWriter) error {
	return ReplaceWeddingMemoryBookPhotos403JSONResponse{ForbiddenJSONResponse: ForbiddenJSONResponse(forbidden(r.detail))}.VisitReplaceWeddingMemoryBookPhotosResponse(w)
}

func replaceMemoryBookPhotosNotFound() replaceMemoryBookPhotosNotFoundResp {
	return replaceMemoryBookPhotosNotFoundResp{}
}

type replaceMemoryBookPhotosNotFoundResp struct{}

func (r replaceMemoryBookPhotosNotFoundResp) VisitReplaceWeddingMemoryBookPhotosResponse(w http.ResponseWriter) error {
	return ReplaceWeddingMemoryBookPhotos404JSONResponse{NotFoundJSONResponse: NotFoundJSONResponse(notFound("wedding not found"))}.VisitReplaceWeddingMemoryBookPhotosResponse(w)
}

func replaceMemoryBookPhotosBadRequest(detail string, invalidIDs []openapi_types.UUID) ReplaceWeddingMemoryBookPhotos400JSONResponse {
	resp := ReplaceWeddingMemoryBookPhotos400JSONResponse{
		Error: detail,
	}
	if len(invalidIDs) > 0 {
		ids := invalidIDs
		resp.InvalidIds = &ids
	}
	return resp
}

// 컴파일 가드 — 인터페이스를 만족하는지 컴파일 단계에서 확인.
var (
	_ context.Context = nil
)
