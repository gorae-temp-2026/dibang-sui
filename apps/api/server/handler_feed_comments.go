package api

import (
	"context"
	"errors"
	"unicode/utf8"
)

const defaultCommentLimit = 20

func (s *Server) CreateFeedComment(ctx context.Context, req CreateFeedCommentRequestObject) (CreateFeedCommentResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return CreateFeedComment401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	// Validate message length (1-50 characters).
	msgLen := utf8.RuneCountInString(req.Body.Message)
	if msgLen == 0 || msgLen > 50 {
		return CreateFeedComment400JSONResponse{BadRequestJSONResponse{
			Type:   "about:blank",
			Title:  "Bad Request",
			Status: 400,
			Detail: strPtr("message must be between 1 and 50 characters"),
		}}, nil
	}

	comment, err := s.FeedComments.Create(ctx, uuidToOpenapi(userID), req.Body)
	if err != nil {
		return nil, err
	}

	return CreateFeedComment201JSONResponse(*comment), nil
}

func (s *Server) ListFeedComments(ctx context.Context, req ListFeedCommentsRequestObject) (ListFeedCommentsResponseObject, error) {
	_, ok := UserIDFromContext(ctx)
	if !ok {
		return ListFeedComments401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	limit := defaultCommentLimit
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}

	var cursor *string
	if req.Params.Cursor != nil {
		cursor = req.Params.Cursor
	}

	comments, hasMore, nextCursor, err := s.FeedComments.List(
		ctx,
		string(req.Params.TargetType),
		req.Params.TargetId,
		cursor,
		limit,
	)
	if err != nil {
		return nil, err
	}

	return ListFeedComments200JSONResponse(FeedCommentListResponse{
		Data:       comments,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}), nil
}

func (s *Server) DeleteFeedComment(ctx context.Context, req DeleteFeedCommentRequestObject) (DeleteFeedCommentResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return DeleteFeedComment401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	err := s.FeedComments.Delete(ctx, req.CommentId, uuidToOpenapi(userID))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return DeleteFeedComment404JSONResponse{NotFoundJSONResponse{
				Type:   "about:blank",
				Title:  "Not Found",
				Status: 404,
				Detail: strPtr("comment not found"),
			}}, nil
		}
		if errors.Is(err, ErrForbidden) {
			return DeleteFeedComment403JSONResponse{ForbiddenJSONResponse{
				Type:   "about:blank",
				Title:  "Forbidden",
				Status: 403,
				Detail: strPtr("only the comment author can delete"),
			}}, nil
		}
		return nil, err
	}

	return DeleteFeedComment204Response{}, nil
}
