package api

import (
	"context"
	"errors"
)

// CreateMemory — 인증 필수. text·photo_url을 받아 v3_memories INSERT.
// _scenario/memory-domain-split/SCENARIOS.md S-01·S-02·S-03.
func (s *Server) CreateMemory(ctx context.Context, req CreateMemoryRequestObject) (CreateMemoryResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return CreateMemory401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	if req.Body == nil {
		return nil, errors.New("missing request body")
	}

	// DB에는 object key만 저장 — 절대 URL은 정규화 (STORAGE.md, 양형식 수용)
	photoRef := req.Body.PhotoUrl
	if photoRef != nil {
		k := s.storageKeyFromRef(*photoRef)
		photoRef = &k
	}
	m, err := s.Memories.Create(ctx, req.Body.LoungeId, userID, req.Body.Text, photoRef)
	if err != nil {
		return nil, err
	}
	if m.PhotoUrl != nil {
		*m.PhotoUrl = s.storageURLFromRef(*m.PhotoUrl)
	}
	return CreateMemory201JSONResponse(*m), nil
}

// ListMemories — 인증 필수. created_at DESC 최근순 (deleted_at IS NULL).
// "온기" 그리드 사람별 collapse는 클라이언트에서 처리(시나리오 S-06).
func (s *Server) ListMemories(ctx context.Context, req ListMemoriesRequestObject) (ListMemoriesResponseObject, error) {
	if _, ok := UserIDFromContext(ctx); !ok {
		return ListMemories401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	limit := int32(100)
	if req.Params.Limit != nil {
		limit = int32(*req.Params.Limit)
	}

	memories, err := s.Memories.ListByLounge(ctx, req.LoungeId, limit)
	if err != nil {
		return nil, err
	}
	// photo_url은 DB에 object key — 조회 시 URL 조립 (레거시 절대 URL은 통과)
	for i := range memories {
		if memories[i].PhotoUrl != nil {
			*memories[i].PhotoUrl = s.storageURLFromRef(*memories[i].PhotoUrl)
		}
	}
	return ListMemories200JSONResponse{Data: memories}, nil
}

// DeleteMemory — 본인만 soft delete (시나리오 S-09).
func (s *Server) DeleteMemory(ctx context.Context, req DeleteMemoryRequestObject) (DeleteMemoryResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return DeleteMemory401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	err := s.Memories.SoftDelete(ctx, req.MemoryId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return DeleteMemory404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("memory not found"),
			}}, nil
		}
		if errors.Is(err, ErrForbidden) {
			return DeleteMemory403JSONResponse{ForbiddenJSONResponse{
				Type:   "about:blank",
				Title:  "Forbidden",
				Status: 403,
				Detail: strPtr("author mismatch"),
			}}, nil
		}
		return nil, err
	}
	return DeleteMemory204Response{}, nil
}
