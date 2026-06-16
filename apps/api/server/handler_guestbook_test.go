package api

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// --- mock ---

type mockGuestbookService struct {
	CreateFn        func(ctx context.Context, loungeID openapi_types.UUID, req *CreateGuestbookEntryRequest) (*GuestbookEntry, error)
	ListFn          func(ctx context.Context, loungeID openapi_types.UUID, cursor *string, limit int) ([]GuestbookEntry, bool, *string, error)
	ClaimFn         func(ctx context.Context, entryID openapi_types.UUID, userID pgtype.UUID) error
	CreateMessageFn func(ctx context.Context, entryID openapi_types.UUID, req *CreateGuestbookMessageRequest) (*GuestbookMessage, error)
	RecordMessageViewFn func(ctx context.Context, messageID openapi_types.UUID, viewerID pgtype.UUID) error
	GetByGuestFn    func(ctx context.Context, loungeID openapi_types.UUID, userID pgtype.UUID) (*GuestbookEntry, error)
}

func (m *mockGuestbookService) Create(ctx context.Context, loungeID openapi_types.UUID, req *CreateGuestbookEntryRequest) (*GuestbookEntry, error) {
	return m.CreateFn(ctx, loungeID, req)
}

func (m *mockGuestbookService) List(ctx context.Context, loungeID openapi_types.UUID, cursor *string, limit int) ([]GuestbookEntry, bool, *string, error) {
	return m.ListFn(ctx, loungeID, cursor, limit)
}

func (m *mockGuestbookService) Claim(ctx context.Context, entryID openapi_types.UUID, userID pgtype.UUID) error {
	return m.ClaimFn(ctx, entryID, userID)
}

func (m *mockGuestbookService) CreateMessage(ctx context.Context, entryID openapi_types.UUID, req *CreateGuestbookMessageRequest) (*GuestbookMessage, error) {
	return m.CreateMessageFn(ctx, entryID, req)
}

func (m *mockGuestbookService) GetByGuest(ctx context.Context, loungeID openapi_types.UUID, userID pgtype.UUID) (*GuestbookEntry, error) {
	return m.GetByGuestFn(ctx, loungeID, userID)
}

func (m *mockGuestbookService) RecordMessageView(ctx context.Context, messageID openapi_types.UUID, viewerID pgtype.UUID) error {
	return m.RecordMessageViewFn(ctx, messageID, viewerID)
}

func newGuestbookTestServer(svc GuestbookService) *Server {
	return &Server{Guestbook: svc}
}

// ========================================
// RecordGuestbookMessageView
// ========================================

func TestRecordGuestbookMessageView_Success(t *testing.T) {
	userID := testUUID()
	called := false
	mock := &mockGuestbookService{
		RecordMessageViewFn: func(ctx context.Context, mid openapi_types.UUID, vid pgtype.UUID) error {
			called = true
			return nil
		},
	}
	srv := newGuestbookTestServer(mock)
	ctx := ctxWithUser(userID)

	resp, err := srv.RecordGuestbookMessageView(ctx, RecordGuestbookMessageViewRequestObject{MessageId: testOpenapiUUID()})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !called {
		t.Fatal("service RecordMessageView should be called")
	}
	if _, ok := resp.(RecordGuestbookMessageView204Response); !ok {
		t.Fatalf("expected 204, got %T", resp)
	}
}

func TestRecordGuestbookMessageView_Unauthenticated(t *testing.T) {
	mock := &mockGuestbookService{
		RecordMessageViewFn: func(ctx context.Context, mid openapi_types.UUID, vid pgtype.UUID) error {
			t.Fatal("service should not be called for unauthenticated request")
			return nil
		},
	}
	srv := newGuestbookTestServer(mock)

	resp, err := srv.RecordGuestbookMessageView(context.Background(), RecordGuestbookMessageViewRequestObject{MessageId: testOpenapiUUID()})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(RecordGuestbookMessageView401JSONResponse); !ok {
		t.Fatalf("expected 401, got %T", resp)
	}
}

func TestRecordGuestbookMessageView_NotFound(t *testing.T) {
	userID := testUUID()
	mock := &mockGuestbookService{
		RecordMessageViewFn: func(ctx context.Context, mid openapi_types.UUID, vid pgtype.UUID) error {
			return ErrNotFound
		},
	}
	srv := newGuestbookTestServer(mock)
	ctx := ctxWithUser(userID)

	resp, err := srv.RecordGuestbookMessageView(ctx, RecordGuestbookMessageViewRequestObject{MessageId: testOpenapiUUID()})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(RecordGuestbookMessageView404JSONResponse); !ok {
		t.Fatalf("expected 404, got %T", resp)
	}
}

// ========================================
// GetMyGuestbookEntry
// ========================================

func TestGetMyGuestbookEntry_Success(t *testing.T) {
	loungeID := testOpenapiUUID()
	userID := testUUID()
	now := time.Now()
	guestName := "박태원"
	recipientSlot := GuestbookEntryRecipientSlot("groom")
	relationCategory := GuestbookEntryRelationCategory("friend")

	mock := &mockGuestbookService{
		GetByGuestFn: func(ctx context.Context, lid openapi_types.UUID, uid pgtype.UUID) (*GuestbookEntry, error) {
			if lid != loungeID {
				t.Fatalf("expected loungeID %v, got %v", loungeID, lid)
			}
			return &GuestbookEntry{
				Id:               testOpenapiUUID(),
				LoungeId:         loungeID,
				GuestName:        guestName,
				RecipientSlot:    recipientSlot,
				RelationCategory: relationCategory,
				CreatedAt:        now,
			}, nil
		},
	}

	srv := newGuestbookTestServer(mock)
	ctx := ctxWithUser(userID)

	resp, err := srv.GetMyGuestbookEntry(ctx, GetMyGuestbookEntryRequestObject{
		LoungeId: loungeID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(GetMyGuestbookEntry200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	if r.GuestName != guestName {
		t.Fatalf("expected guest_name %q, got %q", guestName, r.GuestName)
	}
}

func TestGetMyGuestbookEntry_NotFound(t *testing.T) {
	loungeID := testOpenapiUUID()
	userID := testUUID()

	mock := &mockGuestbookService{
		GetByGuestFn: func(ctx context.Context, lid openapi_types.UUID, uid pgtype.UUID) (*GuestbookEntry, error) {
			return nil, ErrNotFound
		},
	}

	srv := newGuestbookTestServer(mock)
	ctx := ctxWithUser(userID)

	resp, err := srv.GetMyGuestbookEntry(ctx, GetMyGuestbookEntryRequestObject{
		LoungeId: loungeID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, ok := resp.(GetMyGuestbookEntry404JSONResponse)
	if !ok {
		t.Fatalf("expected 404 response, got %T", resp)
	}
}

func TestGetMyGuestbookEntry_Unauthenticated(t *testing.T) {
	mock := &mockGuestbookService{
		GetByGuestFn: func(ctx context.Context, lid openapi_types.UUID, uid pgtype.UUID) (*GuestbookEntry, error) {
			t.Fatal("service should not be called for unauthenticated request")
			return nil, nil
		},
	}

	srv := newGuestbookTestServer(mock)

	resp, err := srv.GetMyGuestbookEntry(context.Background(), GetMyGuestbookEntryRequestObject{
		LoungeId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, ok := resp.(GetMyGuestbookEntry401JSONResponse)
	if !ok {
		t.Fatalf("expected 401 response, got %T", resp)
	}
}

func TestGetMyGuestbookEntry_ServiceError(t *testing.T) {
	userID := testUUID()

	mock := &mockGuestbookService{
		GetByGuestFn: func(ctx context.Context, lid openapi_types.UUID, uid pgtype.UUID) (*GuestbookEntry, error) {
			return nil, errors.New("db error")
		},
	}

	srv := newGuestbookTestServer(mock)
	ctx := ctxWithUser(userID)

	_, err := srv.GetMyGuestbookEntry(ctx, GetMyGuestbookEntryRequestObject{
		LoungeId: testOpenapiUUID(),
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
