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

type loungeCheckInService struct {
	pool *pgxpool.Pool
}

func NewLoungeCheckInService(pool *pgxpool.Pool) LoungeCheckInService {
	return &loungeCheckInService{pool: pool}
}

func (s *loungeCheckInService) List(ctx context.Context, placeID openapi_types.UUID, cursor *string, limit int) ([]LoungeCheckIn, bool, *string, error) {
	q := db.New(s.pool)

	var cursorTs pgtype.Timestamptz
	if cursor != nil {
		if t, err := time.Parse(time.RFC3339Nano, *cursor); err == nil {
			cursorTs = pgtype.Timestamptz{Time: t, Valid: true}
		}
	}

	fetchLimit := int32(limit + 1)

	rows, err := q.ListLoungeCheckIns(ctx, db.ListLoungeCheckInsParams{
		ID:     pgtype.UUID{Bytes: placeID, Valid: true},
		Limit:  fetchLimit,
		Cursor: cursorTs,
	})
	if err != nil {
		return nil, false, nil, err
	}

	hasMore := len(rows) > limit
	if hasMore {
		rows = rows[:limit]
	}

	entries := make([]LoungeCheckIn, len(rows))
	for i, row := range rows {
		entries[i] = *toLoungeCheckIn(row)
	}

	var nextCursor *string
	if hasMore && len(entries) > 0 {
		last := entries[len(entries)-1]
		c := last.CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &c
	}

	return entries, hasMore, nextCursor, nil
}

func (s *loungeCheckInService) Create(ctx context.Context, loungeID openapi_types.UUID, userID openapi_types.UUID, req *CreateLoungeCheckInRequest) (*LoungeCheckIn, error) {
	q := db.New(s.pool)
	userUUID := pgtype.UUID{Bytes: userID, Valid: true}
	loungeUUID := pgtype.UUID{Bytes: loungeID, Valid: true}

	// LoungeCheckIn = 한 user당 한 lounge에 1건(하객 정체성/멤버십). 선조회 후 삽입은
	// check-then-act라 동시 입장 시 race가 남는다(AUD-7). 정석 race-safe
	// get-or-create: visitor_name 확보 → INSERT(ON CONFLICT DO NOTHING) →
	// 충돌(이미 입장, 0행→ErrNoRows)이면 기존 행 재조회. 멱등성은 DB
	// UNIQUE(user_id, lounge_id)가 보장한다.

	// visitor_name: v3_users.name (user_id 직접 — Moi 경유 불필요)
	var visitorName string
	if err := s.pool.QueryRow(ctx,
		`SELECT name FROM v3_users WHERE id = $1`, userUUID,
	).Scan(&visitorName); err != nil {
		return nil, err
	}

	params := db.InsertLoungeCheckInParams{
		UserID:      userUUID,
		LoungeID:    loungeUUID,
		VisitorName: visitorName,
	}
	if req != nil {
		if req.RecipientSlot != nil {
			params.RecipientSlot = pgtype.Text{String: string(*req.RecipientSlot), Valid: true}
		}
		if req.RelationCategory != nil {
			params.RelationCategory = pgtype.Text{String: string(*req.RelationCategory), Valid: true}
		}
		if req.RelationDetail != nil {
			params.RelationDetail = pgtype.Text{String: *req.RelationDetail, Valid: true}
		}
	}

	row, err := q.InsertLoungeCheckIn(ctx, params)
	if errors.Is(err, pgx.ErrNoRows) {
		// 이미 입장됨(동시 요청 또는 재입장): UNIQUE 충돌로 0행 → 기존 행 반환.
		existing, gerr := q.GetLoungeCheckInByUserAndLounge(ctx, db.GetLoungeCheckInByUserAndLoungeParams{
			UserID:   userUUID,
			LoungeID: loungeUUID,
		})
		if gerr != nil {
			return nil, gerr
		}
		return buildLoungeCheckIn(existing.ID, existing.UserID, existing.LoungeID, existing.VisitorName, existing.CreatedAt, existing.RecipientSlot, existing.RelationCategory, existing.RelationDetail), nil
	}
	if err != nil {
		return nil, err
	}

	return buildLoungeCheckIn(row.ID, row.UserID, row.LoungeID, row.VisitorName, row.CreatedAt, row.RecipientSlot, row.RelationCategory, row.RelationDetail), nil
}

func (s *loungeCheckInService) GetByUser(ctx context.Context, loungeID openapi_types.UUID, userID pgtype.UUID) (*LoungeCheckIn, error) {
	q := db.New(s.pool)

	row, err := q.GetLoungeCheckInByUserAndLounge(ctx, db.GetLoungeCheckInByUserAndLoungeParams{
		UserID:   userID,
		LoungeID: pgtype.UUID{Bytes: loungeID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return buildLoungeCheckIn(row.ID, row.UserID, row.LoungeID, row.VisitorName, row.CreatedAt, row.RecipientSlot, row.RelationCategory, row.RelationDetail), nil
}

// buildLoungeCheckIn: 옵션 B 그레인(user_id, lounge_id). sqlc 명시컬럼으로 쿼리별 Row가
// 분리되어 공통 필드를 받는 단일 빌더로 통일.
func buildLoungeCheckIn(id, userID, loungeID pgtype.UUID, visitorName string, createdAt pgtype.Timestamptz, recipientSlot, relationCategory, relationDetail pgtype.Text) *LoungeCheckIn {
	le := &LoungeCheckIn{
		Id:          uuidToOpenapi(id),
		UserId:      uuidToOpenapi(userID),
		LoungeId:    uuidToOpenapi(loungeID),
		VisitorName: &visitorName,
		CreatedAt:   createdAt.Time,
	}
	if recipientSlot.Valid {
		slot := LoungeCheckInRecipientSlot(recipientSlot.String)
		le.RecipientSlot = &slot
	}
	if relationCategory.Valid {
		cat := LoungeCheckInRelationCategory(relationCategory.String)
		le.RelationCategory = &cat
	}
	if relationDetail.Valid {
		le.RelationDetail = &relationDetail.String
	}
	return le
}

func toLoungeCheckIn(row db.ListLoungeCheckInsRow) *LoungeCheckIn {
	return buildLoungeCheckIn(
		row.ID, row.UserID, row.LoungeID,
		row.VisitorName, row.CreatedAt,
		row.RecipientSlot, row.RelationCategory, row.RelationDetail,
	)
}
