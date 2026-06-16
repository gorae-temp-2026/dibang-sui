package api

import (
	"context"
	"time"

	"gorae-api/db"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type cashGiftService struct {
	pool *pgxpool.Pool
}

func NewCashGiftService(pool *pgxpool.Pool) CashGiftService {
	return &cashGiftService{pool: pool}
}

func (s *cashGiftService) Create(ctx context.Context, req *CreateCashGiftRequest) (*CashGift, error) {
	q := db.New(s.pool)

	params := db.InsertCashGiftParams{
		WeddingID:        pgtype.UUID{Bytes: req.WeddingId, Valid: true},
		GuestName:        req.GuestName,
		RecipientSlot:    string(req.RecipientSlot),
		RelationCategory: string(req.RelationCategory),
		RelationDetail:   textFromPtr(req.RelationDetail),
		Amount:           int32(req.Amount),
		PayMethod:        string(req.PayMethod),
		GuestbookEntryID: uuidFromPtr(req.GuestbookEntryId),
	}

	row, err := q.InsertCashGift(ctx, params)
	if err != nil {
		return nil, err
	}

	return buildCashGift(row.ID, row.WeddingID, row.GuestID, row.GuestbookEntryID, row.GuestName, row.RecipientSlot, row.RelationCategory, row.PayMethod, row.RelationDetail, row.Amount, row.CreatedAt, row.Attended), nil
}

func (s *cashGiftService) HostCreate(ctx context.Context, weddingID openapi_types.UUID, req *HostCreateCashGiftRequest) (*CashGift, error) {
	q := db.New(s.pool)

	params := db.InsertCashGiftParams{
		WeddingID:        pgtype.UUID{Bytes: weddingID, Valid: true},
		GuestName:        req.GuestName,
		RecipientSlot:    "groom", // host 수동 입력 시 기본값
		RelationCategory: string(req.RelationCategory),
		RelationDetail:   textFromPtr(req.RelationDetail),
		Amount:           int32(req.Amount),
		PayMethod:        string(req.PayMethod),
	}

	row, err := q.InsertCashGift(ctx, params)
	if err != nil {
		return nil, err
	}

	return buildCashGift(row.ID, row.WeddingID, row.GuestID, row.GuestbookEntryID, row.GuestName, row.RecipientSlot, row.RelationCategory, row.PayMethod, row.RelationDetail, row.Amount, row.CreatedAt, row.Attended), nil
}

func (s *cashGiftService) List(ctx context.Context, weddingID openapi_types.UUID, cursor *string, limit int) ([]CashGift, bool, *string, error) {
	q := db.New(s.pool)

	var cursorTs pgtype.Timestamptz
	if cursor != nil {
		t, err := time.Parse(time.RFC3339Nano, *cursor)
		if err == nil {
			cursorTs = pgtype.Timestamptz{Time: t, Valid: true}
		}
	}

	fetchLimit := int32(limit + 1)

	rows, err := q.ListCashGiftsByWedding(ctx, db.ListCashGiftsByWeddingParams{
		WeddingID: pgtype.UUID{Bytes: weddingID, Valid: true},
		Limit:     fetchLimit,
		Cursor:    cursorTs,
	})
	if err != nil {
		return nil, false, nil, err
	}

	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}

	gifts := make([]CashGift, len(rows))
	for i, row := range rows {
		gifts[i] = *buildCashGift(row.ID, row.WeddingID, row.GuestID, row.GuestbookEntryID, row.GuestName, row.RecipientSlot, row.RelationCategory, row.PayMethod, row.RelationDetail, row.Amount, row.CreatedAt, row.Attended)
	}

	var nextCursor *string
	if hasMore && len(gifts) > 0 {
		last := gifts[len(gifts)-1]
		c := last.CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &c
	}

	return gifts, hasMore, nextCursor, nil
}

func (s *cashGiftService) Summary(ctx context.Context, weddingID openapi_types.UUID) (*CashGiftSummary, error) {
	q := db.New(s.pool)

	row, err := q.GetCashGiftsSummary(ctx, pgtype.UUID{Bytes: weddingID, Valid: true})
	if err != nil {
		return nil, err
	}

	return &CashGiftSummary{
		TotalAmount:   row.TotalAmount,
		TotalCount:    row.TotalCount,
		AttendedCount: row.AttendedCount,
	}, nil
}

func (s *cashGiftService) Update(ctx context.Context, giftID openapi_types.UUID, req *UpdateCashGiftRequest) (*CashGift, error) {
	q := db.New(s.pool)

	// 기존 값을 가져와 변경되지 않은 필드는 유지
	existing, err := q.GetCashGift(ctx, pgtype.UUID{Bytes: giftID, Valid: true})
	if err != nil {
		return nil, ErrNotFound
	}

	guestName := existing.GuestName
	if req.GuestName != nil {
		guestName = *req.GuestName
	}
	amount := existing.Amount
	if req.Amount != nil {
		amount = int32(*req.Amount)
	}
	relationCategory := existing.RelationCategory
	if req.RelationCategory != nil {
		relationCategory = string(*req.RelationCategory)
	}
	relationDetail := existing.RelationDetail
	if req.RelationDetail != nil {
		relationDetail = textFromPtr(req.RelationDetail)
	}
	payMethod := existing.PayMethod
	if req.PayMethod != nil {
		payMethod = string(*req.PayMethod)
	}

	row, err := q.UpdateCashGift(ctx, db.UpdateCashGiftParams{
		ID:               pgtype.UUID{Bytes: giftID, Valid: true},
		GuestName:        guestName,
		Amount:           amount,
		RelationCategory: relationCategory,
		RelationDetail:   relationDetail,
		PayMethod:        payMethod,
	})
	if err != nil {
		return nil, err
	}

	return buildCashGift(row.ID, row.WeddingID, row.GuestID, row.GuestbookEntryID, row.GuestName, row.RecipientSlot, row.RelationCategory, row.PayMethod, row.RelationDetail, row.Amount, row.CreatedAt, row.Attended), nil
}

func (s *cashGiftService) Delete(ctx context.Context, giftID openapi_types.UUID) error {
	q := db.New(s.pool)
	return q.DeleteCashGift(ctx, pgtype.UUID{Bytes: giftID, Valid: true})
}

// buildCashGift: 옵션 B(R2) — is_attended 컬럼 폐지, attended는 GuestbookEntry 존재로
// 도출된 서버 계산 필드. sqlc 명시컬럼으로 쿼리별 Row가 분리되어 공통 빌더로 통일.
func buildCashGift(id, weddingID, guestID, guestbookEntryID pgtype.UUID, guestName, recipientSlot, relationCategory, payMethod string, relationDetail pgtype.Text, amount int32, createdAt pgtype.Timestamptz, attended bool) *CashGift {
	a := attended
	return &CashGift{
		Id:               uuidToOpenapi(id),
		WeddingId:        uuidToOpenapi(weddingID),
		GuestName:        guestName,
		GuestId:          uuidPtrToOpenapi(guestID),
		RecipientSlot:    CashGiftRecipientSlot(recipientSlot),
		RelationCategory: CashGiftRelationCategory(relationCategory),
		RelationDetail:   ptrFromText(relationDetail),
		Amount:           int(amount),
		PayMethod:        CashGiftPayMethod(payMethod),
		Attended:         &a,
		GuestbookEntryId: uuidPtrToOpenapi(guestbookEntryID),
		CreatedAt:        createdAt.Time,
	}
}
