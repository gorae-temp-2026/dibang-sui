package api

import (
	"context"
)

func (s *Server) ToggleFeedHeart(ctx context.Context, req ToggleFeedHeartRequestObject) (ToggleFeedHeartResponseObject, error) {
	userID, ok := UserIDFromContext(ctx)
	if !ok {
		return ToggleFeedHeart401JSONResponse{UnauthorizedJSONResponse{
			Type:   "about:blank",
			Title:  "Unauthorized",
			Status: 401,
			Detail: strPtr("authentication required"),
		}}, nil
	}

	hearted, heartCount, err := s.FeedHearts.Toggle(
		ctx,
		uuidToOpenapi(userID),
		string(req.Body.TargetType),
		req.Body.TargetId,
	)
	if err != nil {
		return nil, err
	}

	return ToggleFeedHeart200JSONResponse(FeedHeartResponse{
		Hearted:    hearted,
		HeartCount: heartCount,
	}), nil
}
