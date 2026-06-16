package api

import (
	"context"
	"testing"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

// --- mock ---

type mockFeedService struct {
	ListFeedFn func(ctx context.Context, loungeID openapi_types.UUID, userID *openapi_types.UUID, cursor *string, limit int) ([]FeedItem, bool, *string, error)
}

func (m *mockFeedService) ListFeed(ctx context.Context, loungeID openapi_types.UUID, userID *openapi_types.UUID, cursor *string, limit int) ([]FeedItem, bool, *string, error) {
	return m.ListFeedFn(ctx, loungeID, userID, cursor, limit)
}

func newFeedTestServer(feed FeedService) *Server {
	return &Server{Feed: feed}
}

// ========================================
// ListFeed
// ========================================

func TestListFeed_Success(t *testing.T) {
	loungeID := testOpenapiUUID()
	now := time.Now()
	heartCount := 38
	commentCount := 2
	myHeart := true
	guestData := map[string]interface{}{
		"guest_name":        "test",
		"recipient_slot":    "bride",
		"relation_category": "friend",
		"message":           "hello",
	}

	mock := &mockFeedService{
		ListFeedFn: func(ctx context.Context, lid openapi_types.UUID, uid *openapi_types.UUID, cursor *string, limit int) ([]FeedItem, bool, *string, error) {
			return []FeedItem{
				{
					Type:         FeedItemTypeGuestbookEntry,
					Id:           testOpenapiUUID(),
					CreatedAt:    now,
					Data:         &guestData,
					HeartCount:   &heartCount,
					CommentCount: &commentCount,
					MyHeart:      &myHeart,
				},
			}, false, nil, nil
		},
	}

	srv := newFeedTestServer(mock)
	uid := testUUID()
	ctx := ctxWithUser(uid)

	resp, err := srv.ListFeed(ctx, ListFeedRequestObject{
		LoungeId: loungeID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(ListFeed200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	if len(r.Data) != 1 {
		t.Fatalf("expected 1 item, got %d", len(r.Data))
	}
	if r.Data[0].Type != FeedItemTypeGuestbookEntry {
		t.Fatalf("expected guestbook_entry type, got %s", r.Data[0].Type)
	}
	if *r.Data[0].HeartCount != 38 {
		t.Fatalf("expected heart_count 38, got %d", *r.Data[0].HeartCount)
	}
	if r.HasMore {
		t.Fatal("expected has_more=false")
	}
}

func TestListFeed_WithCursorAndLimit(t *testing.T) {
	loungeID := testOpenapiUUID()
	cursor := "2026-01-01T00:00:00Z"
	limit := 5

	mock := &mockFeedService{
		ListFeedFn: func(ctx context.Context, lid openapi_types.UUID, uid *openapi_types.UUID, c *string, l int) ([]FeedItem, bool, *string, error) {
			if c == nil || *c != cursor {
				t.Fatalf("expected cursor %q, got %v", cursor, c)
			}
			if l != limit {
				t.Fatalf("expected limit %d, got %d", limit, l)
			}
			nextCur := "2025-12-31T00:00:00Z"
			return []FeedItem{}, true, &nextCur, nil
		},
	}

	srv := newFeedTestServer(mock)
	resp, err := srv.ListFeed(context.Background(), ListFeedRequestObject{
		LoungeId: loungeID,
		Params: ListFeedParams{
			Cursor: &cursor,
			Limit:  &limit,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(ListFeed200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	if !r.HasMore {
		t.Fatal("expected has_more=true")
	}
	if r.NextCursor == nil || *r.NextCursor != "2025-12-31T00:00:00Z" {
		t.Fatalf("expected next_cursor, got %v", r.NextCursor)
	}
}

func TestListFeed_UnauthenticatedStillWorks(t *testing.T) {
	loungeID := testOpenapiUUID()

	mock := &mockFeedService{
		ListFeedFn: func(ctx context.Context, lid openapi_types.UUID, uid *openapi_types.UUID, cursor *string, limit int) ([]FeedItem, bool, *string, error) {
			if uid != nil {
				t.Fatal("expected nil userID for unauthenticated request")
			}
			return []FeedItem{}, false, nil, nil
		},
	}

	srv := newFeedTestServer(mock)
	// No user in context — feed is public
	resp, err := srv.ListFeed(context.Background(), ListFeedRequestObject{
		LoungeId: loungeID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, ok := resp.(ListFeed200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
}

func TestListFeed_MixedTypes(t *testing.T) {
	loungeID := testOpenapiUUID()
	now := time.Now()

	guestData := map[string]interface{}{"guest_name": "test"}
	moiData := map[string]interface{}{"visitor_name": "visitor"}
	announcementData := map[string]interface{}{"message": "hello", "is_pinned": true}
	heartCount := 10
	commentCount := 3
	myHeart := false

	mock := &mockFeedService{
		ListFeedFn: func(ctx context.Context, lid openapi_types.UUID, uid *openapi_types.UUID, cursor *string, limit int) ([]FeedItem, bool, *string, error) {
			return []FeedItem{
				{Type: FeedItemTypeGuestbookEntry, Id: testOpenapiUUID(), CreatedAt: now, Data: &guestData, HeartCount: &heartCount, CommentCount: &commentCount, MyHeart: &myHeart},
				{Type: FeedItemTypeLoungeCheckIn, Id: testOpenapiUUID(), CreatedAt: now.Add(-time.Minute), Data: &moiData},
				{Type: FeedItemTypeHostAnnouncement, Id: testOpenapiUUID(), CreatedAt: now.Add(-2 * time.Minute), Data: &announcementData, HeartCount: &heartCount, CommentCount: &commentCount, MyHeart: &myHeart},
			}, false, nil, nil
		},
	}

	srv := newFeedTestServer(mock)
	resp, err := srv.ListFeed(context.Background(), ListFeedRequestObject{
		LoungeId: loungeID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(ListFeed200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	if len(r.Data) != 3 {
		t.Fatalf("expected 3 items, got %d", len(r.Data))
	}
	// lounge_check_in should have no heart_count, comment_count, my_heart
	if r.Data[1].HeartCount != nil {
		t.Fatal("lounge_check_in should not have heart_count")
	}
	if r.Data[1].CommentCount != nil {
		t.Fatal("lounge_check_in should not have comment_count")
	}
	if r.Data[1].MyHeart != nil {
		t.Fatal("lounge_check_in should not have my_heart")
	}
}
