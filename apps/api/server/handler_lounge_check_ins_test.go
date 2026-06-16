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

type mockLoungeCheckInService struct {
	ListFn      func(ctx context.Context, placeID openapi_types.UUID, cursor *string, limit int) ([]LoungeCheckIn, bool, *string, error)
	CreateFn    func(ctx context.Context, loungeID openapi_types.UUID, userID openapi_types.UUID, req *CreateLoungeCheckInRequest) (*LoungeCheckIn, error)
	GetByUserFn func(ctx context.Context, loungeID openapi_types.UUID, userID pgtype.UUID) (*LoungeCheckIn, error)
}

func (m *mockLoungeCheckInService) List(ctx context.Context, placeID openapi_types.UUID, cursor *string, limit int) ([]LoungeCheckIn, bool, *string, error) {
	return m.ListFn(ctx, placeID, cursor, limit)
}

func (m *mockLoungeCheckInService) Create(ctx context.Context, loungeID openapi_types.UUID, userID openapi_types.UUID, req *CreateLoungeCheckInRequest) (*LoungeCheckIn, error) {
	return m.CreateFn(ctx, loungeID, userID, req)
}

func (m *mockLoungeCheckInService) GetByUser(ctx context.Context, loungeID openapi_types.UUID, userID pgtype.UUID) (*LoungeCheckIn, error) {
	return m.GetByUserFn(ctx, loungeID, userID)
}

func newLoungeCheckInTestServer(svc LoungeCheckInService) *Server {
	return &Server{LoungeCheckIns: svc}
}

// ========================================
// ListLoungeCheckIns
// ========================================

func TestListLoungeCheckIns_Success(t *testing.T) {
	placeID := testOpenapiUUID()
	now := time.Now()
	visitorName := "홍길동"

	mock := &mockLoungeCheckInService{
		ListFn: func(ctx context.Context, pid openapi_types.UUID, cursor *string, limit int) ([]LoungeCheckIn, bool, *string, error) {
			if pid != placeID {
				t.Fatalf("expected placeID %v, got %v", placeID, pid)
			}
			if limit != 20 {
				t.Fatalf("expected default limit 20, got %d", limit)
			}
			return []LoungeCheckIn{
				{
					Id:          testOpenapiUUID(),
					UserId:      testOpenapiUUID(),
					LoungeId:    placeID,
					VisitorName: &visitorName,
					CreatedAt:   now,
				},
			}, false, nil, nil
		},
	}

	srv := newLoungeCheckInTestServer(mock)

	resp, err := srv.ListLoungeCheckIns(context.Background(), ListLoungeCheckInsRequestObject{
		PlaceId: placeID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(ListLoungeCheckIns200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	if len(r.Data) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(r.Data))
	}
	if r.HasMore {
		t.Fatal("expected has_more=false")
	}
	if r.Data[0].VisitorName == nil || *r.Data[0].VisitorName != visitorName {
		t.Fatalf("expected visitor_name %q, got %v", visitorName, r.Data[0].VisitorName)
	}
}

func TestListLoungeCheckIns_WithCursorAndLimit(t *testing.T) {
	placeID := testOpenapiUUID()
	cursor := "2026-01-01T00:00:00Z"
	limit := 5

	mock := &mockLoungeCheckInService{
		ListFn: func(ctx context.Context, pid openapi_types.UUID, c *string, l int) ([]LoungeCheckIn, bool, *string, error) {
			if c == nil || *c != cursor {
				t.Fatalf("expected cursor %q, got %v", cursor, c)
			}
			if l != limit {
				t.Fatalf("expected limit %d, got %d", limit, l)
			}
			nextCursor := "2025-12-31T00:00:00Z"
			return []LoungeCheckIn{}, true, &nextCursor, nil
		},
	}

	srv := newLoungeCheckInTestServer(mock)

	resp, err := srv.ListLoungeCheckIns(context.Background(), ListLoungeCheckInsRequestObject{
		PlaceId: placeID,
		Params: ListLoungeCheckInsParams{
			Cursor: &cursor,
			Limit:  &limit,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(ListLoungeCheckIns200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	if !r.HasMore {
		t.Fatal("expected has_more=true")
	}
	if r.NextCursor == nil {
		t.Fatal("expected next_cursor to be set")
	}
}

func TestListLoungeCheckIns_ServiceError(t *testing.T) {
	mock := &mockLoungeCheckInService{
		ListFn: func(ctx context.Context, pid openapi_types.UUID, c *string, l int) ([]LoungeCheckIn, bool, *string, error) {
			return nil, false, nil, errors.New("db error")
		},
	}

	srv := newLoungeCheckInTestServer(mock)

	_, err := srv.ListLoungeCheckIns(context.Background(), ListLoungeCheckInsRequestObject{
		PlaceId: testOpenapiUUID(),
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ========================================
// CreateLoungeCheckIn
// ========================================

func TestCreateLoungeCheckIn_Success(t *testing.T) {
	loungeID := testOpenapiUUID()
	userID := testUUID()
	now := time.Now()
	visitorName := "김철수"

	mock := &mockLoungeCheckInService{
		CreateFn: func(ctx context.Context, lid openapi_types.UUID, uid openapi_types.UUID, req *CreateLoungeCheckInRequest) (*LoungeCheckIn, error) {
			if lid != loungeID {
				t.Fatalf("expected loungeID %v, got %v", loungeID, lid)
			}
			return &LoungeCheckIn{
				Id:          testOpenapiUUID(),
				UserId:      testOpenapiUUID(),
				LoungeId:    testOpenapiUUID(),
				VisitorName: &visitorName,
				CreatedAt:   now,
			}, nil
		},
	}

	srv := newLoungeCheckInTestServer(mock)
	ctx := ctxWithUser(userID)

	resp, err := srv.CreateLoungeCheckIn(ctx, CreateLoungeCheckInRequestObject{
		LoungeId: loungeID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(CreateLoungeCheckIn201JSONResponse)
	if !ok {
		t.Fatalf("expected 201 response, got %T", resp)
	}
	if r.VisitorName == nil || *r.VisitorName != visitorName {
		t.Fatalf("expected visitor_name %q, got %v", visitorName, r.VisitorName)
	}
}

func TestCreateLoungeCheckIn_WithRelationInfo(t *testing.T) {
	loungeID := testOpenapiUUID()
	userID := testUUID()
	now := time.Now()
	visitorName := "정우진"
	slot := LoungeCheckInRecipientSlot("groom")
	cat := LoungeCheckInRelationCategory("친구/지인")
	detail := "대학동기"

	mock := &mockLoungeCheckInService{
		CreateFn: func(ctx context.Context, lid openapi_types.UUID, uid openapi_types.UUID, req *CreateLoungeCheckInRequest) (*LoungeCheckIn, error) {
			if req == nil {
				t.Fatal("expected non-nil request body")
			}
			if req.RecipientSlot == nil || *req.RecipientSlot != CreateLoungeCheckInRequestRecipientSlot("groom") {
				t.Fatalf("expected recipient_slot groom, got %v", req.RecipientSlot)
			}
			return &LoungeCheckIn{
				Id:               testOpenapiUUID(),
				UserId:           testOpenapiUUID(),
				LoungeId:         testOpenapiUUID(),
				VisitorName:      &visitorName,
				RecipientSlot:    &slot,
				RelationCategory: &cat,
				RelationDetail:   &detail,
				CreatedAt:        now,
			}, nil
		},
	}

	srv := newLoungeCheckInTestServer(mock)
	ctx := ctxWithUser(userID)

	reqSlot := CreateLoungeCheckInRequestRecipientSlot("groom")
	reqCat := CreateLoungeCheckInRequestRelationCategory("친구/지인")
	resp, err := srv.CreateLoungeCheckIn(ctx, CreateLoungeCheckInRequestObject{
		LoungeId: loungeID,
		Body: &CreateLoungeCheckInJSONRequestBody{
			RecipientSlot:    &reqSlot,
			RelationCategory: &reqCat,
			RelationDetail:   &detail,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(CreateLoungeCheckIn201JSONResponse)
	if !ok {
		t.Fatalf("expected 201 response, got %T", resp)
	}
	if r.RecipientSlot == nil || *r.RecipientSlot != slot {
		t.Fatalf("expected recipient_slot groom, got %v", r.RecipientSlot)
	}
}

func TestCreateLoungeCheckIn_Unauthenticated(t *testing.T) {
	mock := &mockLoungeCheckInService{
		CreateFn: func(ctx context.Context, lid openapi_types.UUID, uid openapi_types.UUID, req *CreateLoungeCheckInRequest) (*LoungeCheckIn, error) {
			t.Fatal("service should not be called for unauthenticated request")
			return nil, nil
		},
	}

	srv := newLoungeCheckInTestServer(mock)

	resp, err := srv.CreateLoungeCheckIn(context.Background(), CreateLoungeCheckInRequestObject{
		LoungeId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, ok := resp.(createLoungeCheckInUnauthorized)
	if !ok {
		t.Fatalf("expected unauthorized response, got %T", resp)
	}
}

func TestCreateLoungeCheckIn_ServiceError(t *testing.T) {
	userID := testUUID()

	mock := &mockLoungeCheckInService{
		CreateFn: func(ctx context.Context, lid openapi_types.UUID, uid openapi_types.UUID, req *CreateLoungeCheckInRequest) (*LoungeCheckIn, error) {
			return nil, errors.New("db error")
		},
	}

	srv := newLoungeCheckInTestServer(mock)
	ctx := ctxWithUser(userID)

	_, err := srv.CreateLoungeCheckIn(ctx, CreateLoungeCheckInRequestObject{
		LoungeId: testOpenapiUUID(),
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ========================================
// GetMyLoungeCheckIn
// ========================================

func TestGetMyLoungeCheckIn_Success(t *testing.T) {
	loungeID := testOpenapiUUID()
	userID := testUUID()
	now := time.Now()
	visitorName := "정우진"
	slot := LoungeCheckInRecipientSlot("groom")
	cat := LoungeCheckInRelationCategory("친구/지인")

	mock := &mockLoungeCheckInService{
		GetByUserFn: func(ctx context.Context, lid openapi_types.UUID, uid pgtype.UUID) (*LoungeCheckIn, error) {
			if lid != loungeID {
				t.Fatalf("expected loungeID %v, got %v", loungeID, lid)
			}
			return &LoungeCheckIn{
				Id:               testOpenapiUUID(),
				UserId:           testOpenapiUUID(),
				LoungeId:         testOpenapiUUID(),
				VisitorName:      &visitorName,
				RecipientSlot:    &slot,
				RelationCategory: &cat,
				CreatedAt:        now,
			}, nil
		},
	}

	srv := newLoungeCheckInTestServer(mock)
	ctx := ctxWithUser(userID)

	resp, err := srv.GetMyLoungeCheckIn(ctx, GetMyLoungeCheckInRequestObject{
		LoungeId: loungeID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(GetMyLoungeCheckIn200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 response, got %T", resp)
	}
	if r.VisitorName == nil || *r.VisitorName != visitorName {
		t.Fatalf("expected visitor_name %q, got %v", visitorName, r.VisitorName)
	}
}

func TestGetMyLoungeCheckIn_NotFound(t *testing.T) {
	loungeID := testOpenapiUUID()
	userID := testUUID()

	mock := &mockLoungeCheckInService{
		GetByUserFn: func(ctx context.Context, lid openapi_types.UUID, uid pgtype.UUID) (*LoungeCheckIn, error) {
			return nil, ErrNotFound
		},
	}

	srv := newLoungeCheckInTestServer(mock)
	ctx := ctxWithUser(userID)

	resp, err := srv.GetMyLoungeCheckIn(ctx, GetMyLoungeCheckInRequestObject{
		LoungeId: loungeID,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, ok := resp.(GetMyLoungeCheckIn404JSONResponse)
	if !ok {
		t.Fatalf("expected 404 response, got %T", resp)
	}
}

func TestGetMyLoungeCheckIn_Unauthenticated(t *testing.T) {
	mock := &mockLoungeCheckInService{
		GetByUserFn: func(ctx context.Context, lid openapi_types.UUID, uid pgtype.UUID) (*LoungeCheckIn, error) {
			t.Fatal("service should not be called for unauthenticated request")
			return nil, nil
		},
	}

	srv := newLoungeCheckInTestServer(mock)

	resp, err := srv.GetMyLoungeCheckIn(context.Background(), GetMyLoungeCheckInRequestObject{
		LoungeId: testOpenapiUUID(),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	_, ok := resp.(GetMyLoungeCheckIn401JSONResponse)
	if !ok {
		t.Fatalf("expected 401 response, got %T", resp)
	}
}
