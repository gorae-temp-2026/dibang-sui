package api

import (
	"context"
	"net/http"
)

const defaultLoungeCheckInLimit = 20

func (s *Server) ListLoungeCheckIns(ctx context.Context, req ListLoungeCheckInsRequestObject) (ListLoungeCheckInsResponseObject, error) {
	limit := defaultLoungeCheckInLimit
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}

	var cursor *string
	if req.Params.Cursor != nil {
		cursor = req.Params.Cursor
	}

	entries, hasMore, nextCursor, err := s.LoungeCheckIns.List(ctx, req.PlaceId, cursor, limit)
	if err != nil {
		return nil, err
	}

	return ListLoungeCheckIns200JSONResponse(LoungeCheckInListResponse{
		Data:       entries,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}), nil
}

// createLoungeCheckInUnauthorized is returned when the user is not authenticated.
type createLoungeCheckInUnauthorized struct{}

func (r createLoungeCheckInUnauthorized) VisitCreateLoungeCheckInResponse(w http.ResponseWriter) error {
	writeUnauthorized(w)
	return nil
}

func (s *Server) CreateLoungeCheckIn(ctx context.Context, req CreateLoungeCheckInRequestObject) (CreateLoungeCheckInResponseObject, error) {
	uid, ok := UserIDFromContext(ctx)
	if !ok {
		return createLoungeCheckInUnauthorized{}, nil
	}

	userID := uuidToOpenapi(uid)

	entry, err := s.LoungeCheckIns.Create(ctx, req.LoungeId, userID, req.Body)
	if err != nil {
		return nil, err
	}

	return CreateLoungeCheckIn201JSONResponse(*entry), nil
}

func (s *Server) GetMyLoungeCheckIn(ctx context.Context, req GetMyLoungeCheckInRequestObject) (GetMyLoungeCheckInResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return GetMyLoungeCheckIn401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	entry, err := s.LoungeCheckIns.GetByUser(ctx, req.LoungeId, userID)
	if err != nil {
		if err == ErrNotFound {
			return GetMyLoungeCheckIn404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("lounge entry not found"),
			}}, nil
		}
		return nil, err
	}

	return GetMyLoungeCheckIn200JSONResponse(*entry), nil
}
