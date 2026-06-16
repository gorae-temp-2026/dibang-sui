package api

import (
	"context"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

const defaultFeedLimit = 20

func (s *Server) ListFeed(ctx context.Context, req ListFeedRequestObject) (ListFeedResponseObject, error) {
	limit := defaultFeedLimit
	if req.Params.Limit != nil {
		limit = *req.Params.Limit
	}

	var cursor *string
	if req.Params.Cursor != nil {
		cursor = req.Params.Cursor
	}

	// Feed is public, but if authenticated we pass userID for my_heart.
	var userID *openapi_types.UUID
	if uid, ok := UserIDFromContext(ctx); ok {
		id := uuidToOpenapi(uid)
		userID = &id
	}

	items, hasMore, nextCursor, err := s.Feed.ListFeed(ctx, req.LoungeId, userID, cursor, limit)
	if err != nil {
		return nil, err
	}

	// memory의 photo_url은 DB에 object key — 조회 시 URL 조립 (STORAGE.md)
	for i := range items {
		if items[i].Data == nil {
			continue
		}
		d := *items[i].Data
		if ref, ok := d["photo_url"].(string); ok && ref != "" {
			d["photo_url"] = s.storageURLFromRef(ref)
		}
	}

	return ListFeed200JSONResponse(FeedListResponse{
		Data:       items,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}), nil
}
