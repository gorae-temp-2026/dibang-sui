package api

import (
	"context"
	"testing"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

// --- mock ---

type mockFeedHeartService struct {
	ToggleFn func(ctx context.Context, userID openapi_types.UUID, targetType string, targetID openapi_types.UUID) (hearted bool, heartCount int, err error)
}

func (m *mockFeedHeartService) Toggle(ctx context.Context, userID openapi_types.UUID, targetType string, targetID openapi_types.UUID) (bool, int, error) {
	return m.ToggleFn(ctx, userID, targetType, targetID)
}

func newFeedHeartTestServer(hearts FeedHeartService) *Server {
	return &Server{FeedHearts: hearts}
}

// ========================================
// ToggleFeedHeart
// ========================================

func TestToggleFeedHeart_Unauthorized(t *testing.T) {
	srv := newFeedHeartTestServer(&mockFeedHeartService{})
	resp, err := srv.ToggleFeedHeart(context.Background(), ToggleFeedHeartRequestObject{
		Body: &ToggleFeedHeartRequest{
			TargetType: ToggleFeedHeartRequestTargetTypeGuestbookEntry,
			TargetId:   testOpenapiUUID(),
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(ToggleFeedHeart401JSONResponse); !ok {
		t.Fatalf("expected 401, got %T", resp)
	}
}

func TestToggleFeedHeart_AddHeart(t *testing.T) {
	uid := testUUID()
	targetID := testOpenapiUUID()

	mock := &mockFeedHeartService{
		ToggleFn: func(ctx context.Context, userID openapi_types.UUID, targetType string, tid openapi_types.UUID) (bool, int, error) {
			if targetType != "guestbook_entry" {
				t.Fatalf("expected target_type guestbook_entry, got %s", targetType)
			}
			return true, 5, nil
		},
	}

	srv := newFeedHeartTestServer(mock)
	ctx := ctxWithUser(uid)

	resp, err := srv.ToggleFeedHeart(ctx, ToggleFeedHeartRequestObject{
		Body: &ToggleFeedHeartRequest{
			TargetType: ToggleFeedHeartRequestTargetTypeGuestbookEntry,
			TargetId:   targetID,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(ToggleFeedHeart200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if !r.Hearted {
		t.Fatal("expected hearted=true")
	}
	if r.HeartCount != 5 {
		t.Fatalf("expected heart_count 5, got %d", r.HeartCount)
	}
}

func TestToggleFeedHeart_RemoveHeart(t *testing.T) {
	uid := testUUID()
	targetID := testOpenapiUUID()

	mock := &mockFeedHeartService{
		ToggleFn: func(ctx context.Context, userID openapi_types.UUID, targetType string, tid openapi_types.UUID) (bool, int, error) {
			return false, 3, nil
		},
	}

	srv := newFeedHeartTestServer(mock)
	ctx := ctxWithUser(uid)

	resp, err := srv.ToggleFeedHeart(ctx, ToggleFeedHeartRequestObject{
		Body: &ToggleFeedHeartRequest{
			TargetType: ToggleFeedHeartRequestTargetTypeHostAnnouncement,
			TargetId:   targetID,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(ToggleFeedHeart200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if r.Hearted {
		t.Fatal("expected hearted=false")
	}
	if r.HeartCount != 3 {
		t.Fatalf("expected heart_count 3, got %d", r.HeartCount)
	}
}
