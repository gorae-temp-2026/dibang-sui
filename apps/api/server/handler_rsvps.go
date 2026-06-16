package api

import (
	"context"
	"errors"
)

// CreateRsvp — [public] 모바일 청첩장 참석 의사 제출.
func (s *Server) CreateRsvp(ctx context.Context, req CreateRsvpRequestObject) (CreateRsvpResponseObject, error) {
	rsvp, err := s.Rsvps.Create(ctx, req.WeddingId, req.Body)
	if err != nil {
		return nil, err
	}
	return CreateRsvp201JSONResponse(*rsvp), nil
}

// ListRsvps — [auth] 호스트가 자기 측(신랑/신부) 참석 의사만 조회.
func (s *Server) ListRsvps(ctx context.Context, req ListRsvpsRequestObject) (ListRsvpsResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return ListRsvps403JSONResponse{forbidden("authentication required")}, nil
	}

	side, err := s.Rsvps.HostSide(ctx, req.WeddingId, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return ListRsvps404JSONResponse{notFound("wedding not found")}, nil
		}
		return nil, err
	}
	if side == "" {
		return ListRsvps403JSONResponse{forbidden("not a host of this wedding")}, nil
	}

	rsvps, err := s.Rsvps.ListBySide(ctx, req.WeddingId, side)
	if err != nil {
		return nil, err
	}

	return ListRsvps200JSONResponse(RsvpListResponse{
		Data:       rsvps,
		ViewerSide: RsvpListResponseViewerSide(side),
	}), nil
}
