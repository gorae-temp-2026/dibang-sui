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

type mockRsvpService struct {
	CreateFn     func(ctx context.Context, weddingID openapi_types.UUID, req *CreateRsvpRequest) (*Rsvp, error)
	ListBySideFn func(ctx context.Context, weddingID openapi_types.UUID, side string) ([]Rsvp, error)
	HostSideFn   func(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (string, error)
}

func (m *mockRsvpService) Create(ctx context.Context, weddingID openapi_types.UUID, req *CreateRsvpRequest) (*Rsvp, error) {
	return m.CreateFn(ctx, weddingID, req)
}
func (m *mockRsvpService) ListBySide(ctx context.Context, weddingID openapi_types.UUID, side string) ([]Rsvp, error) {
	return m.ListBySideFn(ctx, weddingID, side)
}
func (m *mockRsvpService) HostSide(ctx context.Context, weddingID openapi_types.UUID, userID pgtype.UUID) (string, error) {
	return m.HostSideFn(ctx, weddingID, userID)
}

// ========================================
// CreateRsvp — public 제출
// ========================================

func TestCreateRsvp_Success(t *testing.T) {
	weddingID := testOpenapiUUID()
	mock := &mockRsvpService{
		CreateFn: func(ctx context.Context, wID openapi_types.UUID, req *CreateRsvpRequest) (*Rsvp, error) {
			return &Rsvp{
				Id:             testOpenapiUUID(),
				WeddingId:      wID,
				GuestName:      req.GuestName,
				RecipientSlot:  RsvpRecipientSlotGroom,
				Attendance:     RsvpAttendanceAttending,
				CompanionCount: 0,
				Meal:           RsvpMealUndecided,
				CreatedAt:      time.Now(),
			}, nil
		},
	}
	srv := &Server{Rsvps: mock}

	resp, err := srv.CreateRsvp(context.Background(), CreateRsvpRequestObject{
		WeddingId: weddingID,
		Body: &CreateRsvpRequest{
			RecipientSlot: CreateRsvpRequestRecipientSlotGroom,
			GuestName:     "guest",
			Attendance:    CreateRsvpRequestAttendanceAttending,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	r, ok := resp.(CreateRsvp201JSONResponse)
	if !ok {
		t.Fatalf("expected 201 response, got %T", resp)
	}
	if r.GuestName != "guest" {
		t.Fatalf("expected guest_name 'guest', got %q", r.GuestName)
	}
}

func TestCreateRsvp_ServiceError(t *testing.T) {
	srv := &Server{Rsvps: &mockRsvpService{
		CreateFn: func(ctx context.Context, wID openapi_types.UUID, req *CreateRsvpRequest) (*Rsvp, error) {
			return nil, errors.New("db error")
		},
	}}
	_, err := srv.CreateRsvp(context.Background(), CreateRsvpRequestObject{
		WeddingId: testOpenapiUUID(),
		Body:      &CreateRsvpRequest{RecipientSlot: CreateRsvpRequestRecipientSlotGroom, GuestName: "g", Attendance: CreateRsvpRequestAttendanceAttending},
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

// ========================================
// ListRsvps — host only, 측별
// ========================================

func TestListRsvps_Unauthenticated(t *testing.T) {
	srv := &Server{Rsvps: &mockRsvpService{}}
	resp, err := srv.ListRsvps(context.Background(), ListRsvpsRequestObject{WeddingId: testOpenapiUUID()})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if _, ok := resp.(ListRsvps403JSONResponse); !ok {
		t.Fatalf("expected 403 (unauthenticated), got %T", resp)
	}
}
