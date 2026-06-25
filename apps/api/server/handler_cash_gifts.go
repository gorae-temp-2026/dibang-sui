package api

import (
	"context"
	"errors"
)

func (s *Server) CreateCashGift(ctx context.Context, req CreateCashGiftRequestObject) (CreateCashGiftResponseObject, error) {
	gift, err := s.CashGifts.Create(ctx, req.Body)
	if err != nil {
		return nil, err
	}

	return CreateCashGift201JSONResponse(*gift), nil
}

func (s *Server) ListCashGifts(ctx context.Context, req ListCashGiftsRequestObject) (ListCashGiftsResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return ListCashGifts403JSONResponse{forbidden("authentication required")}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return ListCashGifts403JSONResponse{forbidden("wedding not found")}, nil
		}
		return nil, err
	}
	if !isHost {
		return ListCashGifts403JSONResponse{forbidden("not a host of this wedding")}, nil
	}

	const defaultCashGiftLimit = 20
	limit := defaultCashGiftLimit
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}

	gifts, hasMore, nextCursor, err := s.CashGifts.List(ctx, req.WeddingId, req.Params.Cursor, limit)
	if err != nil {
		return nil, err
	}

	return ListCashGifts200JSONResponse(CashGiftListResponse{
		Data:       gifts,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}), nil
}

func (s *Server) HostCreateCashGift(ctx context.Context, req HostCreateCashGiftRequestObject) (HostCreateCashGiftResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return HostCreateCashGift403JSONResponse{forbidden("authentication required")}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return HostCreateCashGift400JSONResponse{badRequest("wedding not found")}, nil
		}
		return nil, err
	}
	if !isHost {
		return HostCreateCashGift403JSONResponse{forbidden("not a host of this wedding")}, nil
	}

	gift, err := s.CashGifts.HostCreate(ctx, req.WeddingId, req.Body)
	if err != nil {
		return nil, err
	}

	return HostCreateCashGift201JSONResponse(*gift), nil
}

func (s *Server) GetCashGiftsSummary(ctx context.Context, req GetCashGiftsSummaryRequestObject) (GetCashGiftsSummaryResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return GetCashGiftsSummary403JSONResponse{forbidden("authentication required")}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return GetCashGiftsSummary404JSONResponse{notFound("wedding not found")}, nil
		}
		return nil, err
	}
	if !isHost {
		return GetCashGiftsSummary403JSONResponse{forbidden("not a host of this wedding")}, nil
	}

	summary, err := s.CashGifts.Summary(ctx, req.WeddingId)
	if err != nil {
		return nil, err
	}

	return GetCashGiftsSummary200JSONResponse(*summary), nil
}

func (s *Server) UpdateCashGift(ctx context.Context, req UpdateCashGiftRequestObject) (UpdateCashGiftResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return UpdateCashGift403JSONResponse{forbidden("authentication required")}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return UpdateCashGift404JSONResponse{notFound("wedding not found")}, nil
		}
		return nil, err
	}
	if !isHost {
		return UpdateCashGift403JSONResponse{forbidden("not a host of this wedding")}, nil
	}

	gift, err := s.CashGifts.Update(ctx, req.GiftId, req.Body)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return UpdateCashGift404JSONResponse{notFound("cash gift not found")}, nil
		}
		return nil, err
	}

	return UpdateCashGift200JSONResponse(*gift), nil
}

func (s *Server) DeleteCashGift(ctx context.Context, req DeleteCashGiftRequestObject) (DeleteCashGiftResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return DeleteCashGift403JSONResponse{forbidden("authentication required")}, nil
	}

	isHost, err := s.Weddings.IsHost(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return DeleteCashGift404JSONResponse{notFound("wedding not found")}, nil
		}
		return nil, err
	}
	if !isHost {
		return DeleteCashGift403JSONResponse{forbidden("not a host of this wedding")}, nil
	}

	if err := s.CashGifts.Delete(ctx, req.GiftId); err != nil {
		if errors.Is(err, ErrNotFound) {
			return DeleteCashGift404JSONResponse{notFound("cash gift not found")}, nil
		}
		return nil, err
	}

	return DeleteCashGift204Response{}, nil
}

// helpers for error responses
func forbidden(detail string) ForbiddenJSONResponse {
	return ForbiddenJSONResponse{
		Type: "about:blank", Title: "Forbidden", Status: 403,
		Detail: strPtr(detail),
	}
}

func notFound(detail string) NotFoundJSONResponse {
	return NotFoundJSONResponse{
		Type: "about:blank", Title: "Not Found", Status: 404,
		Detail: strPtr(detail),
	}
}

func badRequest(detail string) BadRequestJSONResponse {
	return BadRequestJSONResponse{
		Type: "about:blank", Title: "Bad Request", Status: 400,
		Detail: strPtr(detail),
	}
}
