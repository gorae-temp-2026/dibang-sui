package api

import (
	"context"
	"errors"
	"testing"
	"time"

	openapi_types "github.com/oapi-codegen/runtime/types"
)

// --- mock ---

type mockCashGiftService struct {
	CreateFn     func(ctx context.Context, req *CreateCashGiftRequest) (*CashGift, error)
	HostCreateFn func(ctx context.Context, weddingID openapi_types.UUID, req *HostCreateCashGiftRequest) (*CashGift, error)
	ListFn       func(ctx context.Context, weddingID openapi_types.UUID, cursor *string, limit int) ([]CashGift, bool, *string, error)
	SummaryFn    func(ctx context.Context, weddingID openapi_types.UUID) (*CashGiftSummary, error)
	UpdateFn     func(ctx context.Context, giftID openapi_types.UUID, req *UpdateCashGiftRequest) (*CashGift, error)
	DeleteFn     func(ctx context.Context, giftID openapi_types.UUID) error
}

func (m *mockCashGiftService) Create(ctx context.Context, req *CreateCashGiftRequest) (*CashGift, error) {
	return m.CreateFn(ctx, req)
}

func (m *mockCashGiftService) HostCreate(ctx context.Context, weddingID openapi_types.UUID, req *HostCreateCashGiftRequest) (*CashGift, error) {
	return m.HostCreateFn(ctx, weddingID, req)
}

func (m *mockCashGiftService) List(ctx context.Context, weddingID openapi_types.UUID, cursor *string, limit int) ([]CashGift, bool, *string, error) {
	return m.ListFn(ctx, weddingID, cursor, limit)
}

func (m *mockCashGiftService) Summary(ctx context.Context, weddingID openapi_types.UUID) (*CashGiftSummary, error) {
	return m.SummaryFn(ctx, weddingID)
}

func (m *mockCashGiftService) Update(ctx context.Context, giftID openapi_types.UUID, req *UpdateCashGiftRequest) (*CashGift, error) {
	return m.UpdateFn(ctx, giftID, req)
}

func (m *mockCashGiftService) Delete(ctx context.Context, giftID openapi_types.UUID) error {
	return m.DeleteFn(ctx, giftID)
}

func newCashGiftTestServer(cashGifts CashGiftService) *Server {
	return &Server{CashGifts: cashGifts}
}

// ========================================
// CreateCashGift
// ========================================

func TestCreateCashGift_Success(t *testing.T) {
	now := time.Now()
	weddingID := testOpenapiUUID()
	amount := 50000

	mock := &mockCashGiftService{
		CreateFn: func(ctx context.Context, req *CreateCashGiftRequest) (*CashGift, error) {
			return &CashGift{
				Id:               testOpenapiUUID(),
				WeddingId:        weddingID,
				GuestName:        req.GuestName,
				RecipientSlot:    CashGiftRecipientSlotGroom,
				RelationCategory: CashGiftRelationCategoryN1,
				Amount:           amount,
				PayMethod:        CashGiftPayMethodTransfer,
				CreatedAt:        now,
			}, nil
		},
	}

	srv := newCashGiftTestServer(mock)

	resp, err := srv.CreateCashGift(context.Background(), CreateCashGiftRequestObject{
		Body: &CreateCashGiftRequest{
			WeddingId:        weddingID,
			GuestName:        "test",
			RecipientSlot:    CreateCashGiftRequestRecipientSlotGroom,
			RelationCategory: CreateCashGiftRequestRelationCategoryN1,
			Amount:           amount,
			PayMethod:        CreateCashGiftRequestPayMethodTransfer,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(CreateCashGift201JSONResponse)
	if !ok {
		t.Fatalf("expected 201 response, got %T", resp)
	}
	if r.GuestName != "test" {
		t.Fatalf("expected guest_name 'test', got %q", r.GuestName)
	}
	if r.Amount != amount {
		t.Fatalf("expected amount %d, got %d", amount, r.Amount)
	}
	if r.PayMethod != CashGiftPayMethodTransfer {
		t.Fatalf("expected pay_method 'transfer', got %s", r.PayMethod)
	}
}

func TestCreateCashGift_WithOptionalFields(t *testing.T) {
	now := time.Now()
	weddingID := testOpenapiUUID()
	amount := 100000
	detail := "university"

	mock := &mockCashGiftService{
		CreateFn: func(ctx context.Context, req *CreateCashGiftRequest) (*CashGift, error) {
			return &CashGift{
				Id:               testOpenapiUUID(),
				WeddingId:        weddingID,
				GuestName:        req.GuestName,
				RecipientSlot:    CashGiftRecipientSlotBride,
				RelationCategory: CashGiftRelationCategoryN2,
				RelationDetail:   &detail,
				Amount:           amount,
				PayMethod:        CashGiftPayMethodKakaopay,
				CreatedAt:        now,
			}, nil
		},
	}

	srv := newCashGiftTestServer(mock)

	resp, err := srv.CreateCashGift(context.Background(), CreateCashGiftRequestObject{
		Body: &CreateCashGiftRequest{
			WeddingId:        weddingID,
			GuestName:        "guest",
			RecipientSlot:    CreateCashGiftRequestRecipientSlotBride,
			RelationCategory: CreateCashGiftRequestRelationCategoryN2,
			RelationDetail:   &detail,
			Amount:           amount,
			PayMethod:        CreateCashGiftRequestPayMethodKakaopay,
		},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	r, ok := resp.(CreateCashGift201JSONResponse)
	if !ok {
		t.Fatalf("expected 201 response, got %T", resp)
	}
	if r.RelationDetail == nil || *r.RelationDetail != detail {
		t.Fatalf("expected relation_detail %q, got %v", detail, r.RelationDetail)
	}
}

func TestCreateCashGift_ServiceError(t *testing.T) {
	mock := &mockCashGiftService{
		CreateFn: func(ctx context.Context, req *CreateCashGiftRequest) (*CashGift, error) {
			return nil, errors.New("db error")
		},
	}

	srv := newCashGiftTestServer(mock)

	_, err := srv.CreateCashGift(context.Background(), CreateCashGiftRequestObject{
		Body: &CreateCashGiftRequest{
			WeddingId:        testOpenapiUUID(),
			GuestName:        "test",
			RecipientSlot:    CreateCashGiftRequestRecipientSlotGroom,
			RelationCategory: CreateCashGiftRequestRelationCategoryEmpty,
			Amount:           50000,
			PayMethod:        CreateCashGiftRequestPayMethodTransfer,
		},
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}
