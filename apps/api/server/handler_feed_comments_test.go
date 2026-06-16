package api

import (
	"context"
	"errors"
	"testing"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

// --- mock ---

type mockFeedCommentService struct {
	CreateFn func(ctx context.Context, userID openapi_types.UUID, req *CreateFeedCommentRequest) (*FeedComment, error)
	ListFn   func(ctx context.Context, targetType string, targetID openapi_types.UUID, cursor *string, limit int) ([]FeedComment, bool, *string, error)
	DeleteFn func(ctx context.Context, commentID openapi_types.UUID, userID openapi_types.UUID) error
}

func (m *mockFeedCommentService) Create(ctx context.Context, userID openapi_types.UUID, req *CreateFeedCommentRequest) (*FeedComment, error) {
	return m.CreateFn(ctx, userID, req)
}

func (m *mockFeedCommentService) List(ctx context.Context, targetType string, targetID openapi_types.UUID, cursor *string, limit int) ([]FeedComment, bool, *string, error) {
	return m.ListFn(ctx, targetType, targetID, cursor, limit)
}

func (m *mockFeedCommentService) Delete(ctx context.Context, commentID openapi_types.UUID, userID openapi_types.UUID) error {
	return m.DeleteFn(ctx, commentID, userID)
}

func newFeedCommentTestServer(comments FeedCommentService) *Server {
	return &Server{FeedComments: comments}
}

// ========================================
// CreateFeedComment
// ========================================

func TestCreateFeedComment_Unauthorized(t *testing.T) {
	srv := newFeedCommentTestServer(&mockFeedCommentService{})
	resp, err := srv.CreateFeedComment(context.Background(), CreateFeedCommentRequestObject{
		Body: &CreateFeedCommentRequest{
			TargetType: CreateFeedCommentRequestTargetTypeGuestbookEntry,
			TargetId:   testOpenapiUUID(),
			Message:    "hello",
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateFeedComment401JSONResponse); !ok {
		t.Fatalf("expected 401, got %T", resp)
	}
}

func TestCreateFeedComment_MessageTooLong(t *testing.T) {
	uid := testUUID()
	srv := newFeedCommentTestServer(&mockFeedCommentService{})
	ctx := ctxWithUser(uid)

	longMsg := make([]rune, 51)
	for i := range longMsg {
		longMsg[i] = 'a'
	}

	resp, err := srv.CreateFeedComment(ctx, CreateFeedCommentRequestObject{
		Body: &CreateFeedCommentRequest{
			TargetType: CreateFeedCommentRequestTargetTypeGuestbookEntry,
			TargetId:   testOpenapiUUID(),
			Message:    string(longMsg),
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateFeedComment400JSONResponse); !ok {
		t.Fatalf("expected 400, got %T", resp)
	}
}

func TestCreateFeedComment_EmptyMessage(t *testing.T) {
	uid := testUUID()
	srv := newFeedCommentTestServer(&mockFeedCommentService{})
	ctx := ctxWithUser(uid)

	resp, err := srv.CreateFeedComment(ctx, CreateFeedCommentRequestObject{
		Body: &CreateFeedCommentRequest{
			TargetType: CreateFeedCommentRequestTargetTypeGuestbookEntry,
			TargetId:   testOpenapiUUID(),
			Message:    "",
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(CreateFeedComment400JSONResponse); !ok {
		t.Fatalf("expected 400, got %T", resp)
	}
}

func TestCreateFeedComment_Success(t *testing.T) {
	uid := testUUID()
	targetID := testOpenapiUUID()
	now := time.Now()

	mock := &mockFeedCommentService{
		CreateFn: func(ctx context.Context, userID openapi_types.UUID, req *CreateFeedCommentRequest) (*FeedComment, error) {
			return &FeedComment{
				Id:         testOpenapiUUID(),
				UserId:     userID,
				UserName:   "Kim",
				TargetType: FeedCommentTargetTypeGuestbookEntry,
				TargetId:   req.TargetId,
				Message:    req.Message,
				CreatedAt:  now,
			}, nil
		},
	}

	srv := newFeedCommentTestServer(mock)
	ctx := ctxWithUser(uid)

	resp, err := srv.CreateFeedComment(ctx, CreateFeedCommentRequestObject{
		Body: &CreateFeedCommentRequest{
			TargetType: CreateFeedCommentRequestTargetTypeGuestbookEntry,
			TargetId:   targetID,
			Message:    "congratulations!",
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(CreateFeedComment201JSONResponse)
	if !ok {
		t.Fatalf("expected 201, got %T", resp)
	}
	if r.Message != "congratulations!" {
		t.Fatalf("expected message 'congratulations!', got %q", r.Message)
	}
	if r.UserName != "Kim" {
		t.Fatalf("expected user_name 'Kim', got %q", r.UserName)
	}
}

// ========================================
// ListFeedComments
// ========================================

func TestListFeedComments_Unauthorized(t *testing.T) {
	srv := newFeedCommentTestServer(&mockFeedCommentService{})
	resp, err := srv.ListFeedComments(context.Background(), ListFeedCommentsRequestObject{
		Params: ListFeedCommentsParams{
			TargetType: ListFeedCommentsParamsTargetTypeGuestbookEntry,
			TargetId:   testOpenapiUUID(),
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(ListFeedComments401JSONResponse); !ok {
		t.Fatalf("expected 401, got %T", resp)
	}
}

func TestListFeedComments_Success(t *testing.T) {
	uid := testUUID()
	targetID := testOpenapiUUID()
	now := time.Now()

	mock := &mockFeedCommentService{
		ListFn: func(ctx context.Context, targetType string, tid openapi_types.UUID, cursor *string, limit int) ([]FeedComment, bool, *string, error) {
			return []FeedComment{
				{
					Id:         testOpenapiUUID(),
					UserId:     testOpenapiUUID(),
					UserName:   "Lee",
					TargetType: FeedCommentTargetTypeGuestbookEntry,
					TargetId:   tid,
					Message:    "nice",
					CreatedAt:  now,
				},
			}, false, nil, nil
		},
	}

	srv := newFeedCommentTestServer(mock)
	ctx := ctxWithUser(uid)

	resp, err := srv.ListFeedComments(ctx, ListFeedCommentsRequestObject{
		Params: ListFeedCommentsParams{
			TargetType: ListFeedCommentsParamsTargetTypeGuestbookEntry,
			TargetId:   targetID,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(ListFeedComments200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if len(r.Data) != 1 {
		t.Fatalf("expected 1 comment, got %d", len(r.Data))
	}
	if r.HasMore {
		t.Fatal("expected has_more=false")
	}
}

func TestListFeedComments_WithCursor(t *testing.T) {
	uid := testUUID()
	cursor := "2026-01-01T00:00:00Z"
	limit := 10

	mock := &mockFeedCommentService{
		ListFn: func(ctx context.Context, targetType string, tid openapi_types.UUID, c *string, l int) ([]FeedComment, bool, *string, error) {
			if c == nil || *c != cursor {
				t.Fatalf("expected cursor %q, got %v", cursor, c)
			}
			if l != limit {
				t.Fatalf("expected limit %d, got %d", limit, l)
			}
			nextCur := "2025-12-31T00:00:00Z"
			return []FeedComment{}, true, &nextCur, nil
		},
	}

	srv := newFeedCommentTestServer(mock)
	ctx := ctxWithUser(uid)

	resp, err := srv.ListFeedComments(ctx, ListFeedCommentsRequestObject{
		Params: ListFeedCommentsParams{
			TargetType: ListFeedCommentsParamsTargetTypeGuestbookEntry,
			TargetId:   testOpenapiUUID(),
			Cursor:     &cursor,
			Limit:      &limit,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(ListFeedComments200JSONResponse)
	if !ok {
		t.Fatalf("expected 200, got %T", resp)
	}
	if !r.HasMore {
		t.Fatal("expected has_more=true")
	}
}

// ========================================
// DeleteFeedComment
// ========================================

func TestDeleteFeedComment_Unauthorized(t *testing.T) {
	srv := newFeedCommentTestServer(&mockFeedCommentService{})
	resp, err := srv.DeleteFeedComment(context.Background(), DeleteFeedCommentRequestObject{
		CommentId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteFeedComment401JSONResponse); !ok {
		t.Fatalf("expected 401, got %T", resp)
	}
}

func TestDeleteFeedComment_NotFound(t *testing.T) {
	uid := testUUID()

	mock := &mockFeedCommentService{
		DeleteFn: func(ctx context.Context, commentID openapi_types.UUID, userID openapi_types.UUID) error {
			return ErrNotFound
		},
	}

	srv := newFeedCommentTestServer(mock)
	ctx := ctxWithUser(uid)

	resp, err := srv.DeleteFeedComment(ctx, DeleteFeedCommentRequestObject{
		CommentId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteFeedComment404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

func TestDeleteFeedComment_Forbidden(t *testing.T) {
	uid := testUUID()

	mock := &mockFeedCommentService{
		DeleteFn: func(ctx context.Context, commentID openapi_types.UUID, userID openapi_types.UUID) error {
			return ErrForbidden
		},
	}

	srv := newFeedCommentTestServer(mock)
	ctx := ctxWithUser(uid)

	resp, err := srv.DeleteFeedComment(ctx, DeleteFeedCommentRequestObject{
		CommentId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteFeedComment403JSONResponse); !ok {
		t.Fatalf("expected 403, got %T", resp)
	}
}

func TestDeleteFeedComment_Success(t *testing.T) {
	uid := testUUID()

	mock := &mockFeedCommentService{
		DeleteFn: func(ctx context.Context, commentID openapi_types.UUID, userID openapi_types.UUID) error {
			return nil
		},
	}

	srv := newFeedCommentTestServer(mock)
	ctx := ctxWithUser(uid)

	resp, err := srv.DeleteFeedComment(ctx, DeleteFeedCommentRequestObject{
		CommentId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(DeleteFeedComment204Response); !ok {
		t.Fatalf("expected 204, got %T", resp)
	}
}

func TestDeleteFeedComment_InternalError(t *testing.T) {
	uid := testUUID()

	mock := &mockFeedCommentService{
		DeleteFn: func(ctx context.Context, commentID openapi_types.UUID, userID openapi_types.UUID) error {
			return errors.New("db error")
		},
	}

	srv := newFeedCommentTestServer(mock)
	ctx := ctxWithUser(uid)

	_, err := srv.DeleteFeedComment(ctx, DeleteFeedCommentRequestObject{
		CommentId: testOpenapiUUID(),
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
