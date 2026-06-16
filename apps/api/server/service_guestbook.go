package api

import (
	"context"
	"errors"
	"time"

	"gorae-api/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type guestbookService struct {
	pool *pgxpool.Pool
}

func NewGuestbookService(pool *pgxpool.Pool) GuestbookService {
	return &guestbookService{pool: pool}
}

func (s *guestbookService) Create(ctx context.Context, loungeID openapi_types.UUID, req *CreateGuestbookEntryRequest) (*GuestbookEntry, error) {
	// entry 본문 일원화(20260525130000): entries.message 컬럼 사라짐.
	// 본문은 v3_guestbook_messages에 별도 행으로 같은 트랜잭션 안에서 INSERT.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	q := db.New(tx)

	loungePg := pgtype.UUID{Bytes: loungeID, Valid: true}
	params := db.CreateGuestbookEntryParams{
		LoungeID:         loungePg,
		GuestName:        req.GuestName,
		RecipientSlot:    string(req.RecipientSlot),
		RelationCategory: string(req.RelationCategory),
		RelationDetail:   textFromPtr(req.RelationDetail),
	}
	if uid, ok := UserIDFromContext(ctx); ok {
		params.GuestID = uid
	}

	row, err := q.CreateGuestbookEntry(ctx, params)
	if err != nil {
		return nil, err
	}

	if req.Message != nil && *req.Message != "" {
		if _, err := q.CreateGuestbookMessage(ctx, db.CreateGuestbookMessageParams{
			GuestbookEntryID: row.ID,
			Message:          *req.Message,
			LoungeID:         loungePg,
		}); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return toGuestbookEntry(row), nil
}

func (s *guestbookService) CreateMessage(ctx context.Context, entryID openapi_types.UUID, req *CreateGuestbookMessageRequest) (*GuestbookMessage, error) {
	q := db.New(s.pool)

	// mecdisplay 워크스트림(SCENARIOS §2): 부모 entry에서 lounge_id를 조회해 비정규화
	// 컬럼에 명시 전달. Realtime 구독 `filter:lounge_id=eq.X`의 전제.
	entryPg := pgtype.UUID{Bytes: entryID, Valid: true}
	loungeID, err := q.GetGuestbookEntryLoungeID(ctx, entryPg)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	row, err := q.CreateGuestbookMessage(ctx, db.CreateGuestbookMessageParams{
		GuestbookEntryID: entryPg,
		Message:          req.Message,
		LoungeID:         loungeID,
	})
	if err != nil {
		return nil, err
	}

	zero := 0
	return &GuestbookMessage{
		Id:               uuidToOpenapi(row.ID),
		GuestbookEntryId: uuidToOpenapi(row.GuestbookEntryID),
		Message:          row.Message,
		ViewCount:        &zero,
		CreatedAt:        row.CreatedAt.Time,
	}, nil
}

// RecordMessageView: 피드 글 조회 기록. 메세지 미존재 시 ErrNotFound,
// 작성자 본인(소속 GuestbookEntry.guest_id == viewer)은 제외, 중복은 멱등.
func (s *guestbookService) RecordMessageView(ctx context.Context, messageID openapi_types.UUID, viewerID pgtype.UUID) error {
	q := db.New(s.pool)
	msgPg := pgtype.UUID{Bytes: messageID, Valid: true}

	guestID, err := q.GetGuestbookMessageEntryGuest(ctx, msgPg)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}

	// 작성자 본인은 조회 기록 제외(에러 없이 무시)
	if guestID.Valid && viewerID.Valid && guestID.Bytes == viewerID.Bytes {
		return nil
	}

	return q.RecordGuestbookMessageView(ctx, db.RecordGuestbookMessageViewParams{
		GuestbookMessageID: msgPg,
		ViewerID:           viewerID,
	})
}

func (s *guestbookService) List(ctx context.Context, loungeID openapi_types.UUID, cursor *string, limit int) ([]GuestbookEntry, bool, *string, error) {
	q := db.New(s.pool)

	var cursorTs pgtype.Timestamptz
	if cursor != nil {
		t, err := time.Parse(time.RFC3339Nano, *cursor)
		if err == nil {
			cursorTs = pgtype.Timestamptz{Time: t, Valid: true}
		}
	}

	// Fetch limit+1 to determine hasMore
	fetchLimit := int32(limit + 1)

	rows, err := q.ListGuestbookEntries(ctx, db.ListGuestbookEntriesParams{
		LoungeID: pgtype.UUID{Bytes: loungeID, Valid: true},
		Limit:    fetchLimit,
		Cursor:   cursorTs,
	})
	if err != nil {
		return nil, false, nil, err
	}

	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}

	entries := make([]GuestbookEntry, len(rows))
	for i, row := range rows {
		entries[i] = *toGuestbookEntry(row)
	}

	var nextCursor *string
	if hasMore && len(entries) > 0 {
		last := entries[len(entries)-1]
		c := last.CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &c
	}

	return entries, hasMore, nextCursor, nil
}

func (s *guestbookService) GetByGuest(ctx context.Context, loungeID openapi_types.UUID, userID pgtype.UUID) (*GuestbookEntry, error) {
	q := db.New(s.pool)

	row, err := q.GetGuestbookEntryByGuestAndLounge(ctx, db.GetGuestbookEntryByGuestAndLoungeParams{
		GuestID:  userID,
		LoungeID: pgtype.UUID{Bytes: loungeID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return toGuestbookEntry(row), nil
}

func (s *guestbookService) Claim(ctx context.Context, entryID openapi_types.UUID, userID pgtype.UUID) error {
	q := db.New(s.pool)
	return q.ClaimGuestbookEntry(ctx, db.ClaimGuestbookEntryParams{
		ID:      pgtype.UUID{Bytes: entryID, Valid: true},
		GuestID: userID,
	})
}

func toGuestbookEntry(row db.V3GuestbookEntry) *GuestbookEntry {
	return &GuestbookEntry{
		Id:               uuidToOpenapi(row.ID),
		LoungeId:         uuidToOpenapi(row.LoungeID),
		GuestName:        row.GuestName,
		GuestId:          uuidPtrToOpenapi(row.GuestID),
		RecipientSlot:    GuestbookEntryRecipientSlot(row.RecipientSlot),
		RelationCategory: GuestbookEntryRelationCategory(row.RelationCategory),
		RelationDetail:   ptrFromText(row.RelationDetail),
		CreatedAt:        row.CreatedAt.Time,
	}
}
