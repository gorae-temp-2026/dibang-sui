package api

import (
	"context"
	"errors"
)

const defaultAnnouncementLimit = 20

// ListAnnouncements returns non-deleted announcements for a lounge (public).
func (s *Server) ListAnnouncements(ctx context.Context, req ListAnnouncementsRequestObject) (ListAnnouncementsResponseObject, error) {
	limit := defaultAnnouncementLimit
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}

	var cursor *string
	if req.Params.Cursor != nil {
		cursor = req.Params.Cursor
	}

	entries, hasMore, nextCursor, err := s.Announcements.List(ctx, req.LoungeId, cursor, limit)
	if err != nil {
		return nil, err
	}

	return ListAnnouncements200JSONResponse(AnnouncementListResponse{
		Data:       entries,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}), nil
}

// CreateAnnouncement creates a new host announcement (host only).
func (s *Server) CreateAnnouncement(ctx context.Context, req CreateAnnouncementRequestObject) (CreateAnnouncementResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return CreateAnnouncement401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	weddingID, err := s.Announcements.GetWeddingIDByLoungeID(ctx, req.LoungeId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return CreateAnnouncement404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("lounge not found"),
			}}, nil
		}
		return nil, err
	}

	isHost, err := s.Weddings.IsHost(ctx, weddingID, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return CreateAnnouncement404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return CreateAnnouncement403JSONResponse{ForbiddenJSONResponse{
			Type:   "about:blank",
			Title:  "Forbidden",
			Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	announcement, err := s.Announcements.Create(ctx, req.LoungeId, userID, req.Body)
	if err != nil {
		return nil, err
	}

	return CreateAnnouncement201JSONResponse(*announcement), nil
}

// UpdateAnnouncement updates an existing host announcement (host only).
func (s *Server) UpdateAnnouncement(ctx context.Context, req UpdateAnnouncementRequestObject) (UpdateAnnouncementResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return UpdateAnnouncement401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	existing, err := s.Announcements.GetByID(ctx, req.AnnouncementId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return UpdateAnnouncement404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("announcement not found"),
			}}, nil
		}
		return nil, err
	}

	weddingID, err := s.Announcements.GetWeddingIDByLoungeID(ctx, existing.LoungeId)
	if err != nil {
		return nil, err
	}

	isHost, err := s.Weddings.IsHost(ctx, weddingID, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return UpdateAnnouncement404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return UpdateAnnouncement403JSONResponse{ForbiddenJSONResponse{
			Type:   "about:blank",
			Title:  "Forbidden",
			Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	updated, err := s.Announcements.Update(ctx, req.AnnouncementId, req.Body)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return UpdateAnnouncement404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("announcement not found"),
			}}, nil
		}
		return nil, err
	}

	return UpdateAnnouncement200JSONResponse(*updated), nil
}

// DeleteAnnouncement soft-deletes a host announcement (host only).
func (s *Server) DeleteAnnouncement(ctx context.Context, req DeleteAnnouncementRequestObject) (DeleteAnnouncementResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return DeleteAnnouncement401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	existing, err := s.Announcements.GetByID(ctx, req.AnnouncementId)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return DeleteAnnouncement404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("announcement not found"),
			}}, nil
		}
		return nil, err
	}

	weddingID, err := s.Announcements.GetWeddingIDByLoungeID(ctx, existing.LoungeId)
	if err != nil {
		return nil, err
	}

	isHost, err := s.Weddings.IsHost(ctx, weddingID, userID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return DeleteAnnouncement404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("wedding not found"),
			}}, nil
		}
		return nil, err
	}
	if !isHost {
		return DeleteAnnouncement403JSONResponse{ForbiddenJSONResponse{
			Type:   "about:blank",
			Title:  "Forbidden",
			Status: 403,
			Detail: strPtr("host permission required"),
		}}, nil
	}

	if err := s.Announcements.SoftDelete(ctx, req.AnnouncementId); err != nil {
		return nil, err
	}

	return DeleteAnnouncement204Response{}, nil
}
