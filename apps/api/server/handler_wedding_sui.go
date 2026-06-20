package api

import (
	"context"
	"errors"
)

// UpdateWeddingSuiIds (C7): 온체인 발행 Sui 오브젝트 ID를 Supabase에 dual-write 저장.
// 호스트만 가능. body 없으면 no-op(204).
func (s *Server) UpdateWeddingSuiIds(ctx context.Context, req UpdateWeddingSuiIdsRequestObject) (UpdateWeddingSuiIdsResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return UpdateWeddingSuiIds401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return UpdateWeddingSuiIds404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return UpdateWeddingSuiIds403JSONResponse{ForbiddenJSONResponse{
			Type:   "about:blank",
			Title:  "Forbidden",
			Status: 403,
			Detail: strPtr("not a host of this wedding"),
		}}, nil
	}

	if req.Body == nil {
		return UpdateWeddingSuiIds204Response{}, nil
	}
	if err := s.Weddings.UpdateSuiIds(ctx, req.WeddingId, req.Body.SuiWeddingId, req.Body.SuiLoungeId, req.Body.SuiVaultId); err != nil {
		return nil, err
	}
	return UpdateWeddingSuiIds204Response{}, nil
}
