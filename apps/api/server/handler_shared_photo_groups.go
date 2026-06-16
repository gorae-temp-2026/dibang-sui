package api

import (
	"context"
	"errors"
)

// _scenario/wedding-memorybook-ui-2026-05-24/SCENARIOS.md §S-02 큐레이션 페이지 데이터 소스.

func (s *Server) GetWeddingSharedPhotoGroups(ctx context.Context, req GetWeddingSharedPhotoGroupsRequestObject) (GetWeddingSharedPhotoGroupsResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return GetWeddingSharedPhotoGroups403JSONResponse{forbidden("authentication required")}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return GetWeddingSharedPhotoGroups404JSONResponse{notFound("wedding not found")}, nil
		}
		return nil, err
	}
	if !isHost {
		return GetWeddingSharedPhotoGroups403JSONResponse{forbidden("not a host of this wedding")}, nil
	}

	resp, err := s.SharedPhotoGroups.Get(ctx, req.WeddingId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return GetWeddingSharedPhotoGroups404JSONResponse{notFound("wedding not found")}, nil
		}
		return nil, err
	}
	return GetWeddingSharedPhotoGroups200JSONResponse(*resp), nil
}
