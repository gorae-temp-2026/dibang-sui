package api

import (
	"context"
)

const defaultGuestbookLimit = 20

func (s *Server) ListGuestbookEntries(ctx context.Context, req ListGuestbookEntriesRequestObject) (ListGuestbookEntriesResponseObject, error) {
	limit := defaultGuestbookLimit
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}

	var cursor *string
	if req.Params.Cursor != nil {
		cursor = req.Params.Cursor
	}

	entries, hasMore, nextCursor, err := s.Guestbook.List(ctx, req.LoungeId, cursor, limit)
	if err != nil {
		return nil, err
	}

	return ListGuestbookEntries200JSONResponse(GuestbookEntryListResponse{
		Data:       entries,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}), nil
}

func (s *Server) CreateGuestbookEntry(ctx context.Context, req CreateGuestbookEntryRequestObject) (CreateGuestbookEntryResponseObject, error) {
	entry, err := s.Guestbook.Create(ctx, req.LoungeId, req.Body)
	if err != nil {
		return nil, err
	}

	return CreateGuestbookEntry201JSONResponse(*entry), nil
}

func (s *Server) CreateGuestbookMessage(ctx context.Context, req CreateGuestbookMessageRequestObject) (CreateGuestbookMessageResponseObject, error) {
	msg, err := s.Guestbook.CreateMessage(ctx, req.EntryId, req.Body)
	if err != nil {
		return nil, err
	}

	return CreateGuestbookMessage201JSONResponse(*msg), nil
}

func (s *Server) GetMyGuestbookEntry(ctx context.Context, req GetMyGuestbookEntryRequestObject) (GetMyGuestbookEntryResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return GetMyGuestbookEntry401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	entry, err := s.Guestbook.GetByGuest(ctx, req.LoungeId, userID)
	if err != nil {
		if err == ErrNotFound {
			return GetMyGuestbookEntry404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("guestbook entry not found"),
			}}, nil
		}
		return nil, err
	}

	return GetMyGuestbookEntry200JSONResponse(*entry), nil
}

func (s *Server) ClaimGuestbookEntry(ctx context.Context, req ClaimGuestbookEntryRequestObject) (ClaimGuestbookEntryResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return nil, ErrForbidden
	}

	if err := s.Guestbook.Claim(ctx, req.EntryId, userID); err != nil {
		return nil, err
	}

	return ClaimGuestbookEntry204Response{}, nil
}

func (s *Server) RecordGuestbookMessageView(ctx context.Context, req RecordGuestbookMessageViewRequestObject) (RecordGuestbookMessageViewResponseObject, error) {
	viewerID, ok := UserIDFromContext(ctx)
	if !ok {
		return RecordGuestbookMessageView401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	err := s.Guestbook.RecordMessageView(ctx, req.MessageId, viewerID)
	if err != nil {
		if err == ErrNotFound {
			return RecordGuestbookMessageView404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("guestbook message not found"),
			}}, nil
		}
		return nil, err
	}

	return RecordGuestbookMessageView204Response{}, nil
}
