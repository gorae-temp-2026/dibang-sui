package api

import (
	"context"
	"errors"

	"gorae-api/db"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// MemoryService — 라운지 V2 "온기" 게시물.
// _scenario/memory-domain-split/SCENARIOS.md: text 필수 + 사진 0/1,
// author_user_id 직접 식별(GuestbookEntry 무관 → 게스트·호스트 공통).
type MemoryService interface {
	Create(ctx context.Context, loungeID openapi_types.UUID, authorUserID pgtype.UUID, text string, photoURL *string) (*Memory, error)
	ListByLounge(ctx context.Context, loungeID openapi_types.UUID, limit int32) ([]Memory, error)
	SoftDelete(ctx context.Context, memoryID openapi_types.UUID, authorUserID pgtype.UUID) error
}

type memoryService struct {
	pool *pgxpool.Pool
}

func NewMemoryService(pool *pgxpool.Pool) MemoryService {
	return &memoryService{pool: pool}
}

func (s *memoryService) Create(ctx context.Context, loungeID openapi_types.UUID, authorUserID pgtype.UUID, text string, photoURL *string) (*Memory, error) {
	q := db.New(s.pool)
	row, err := q.CreateMemory(ctx, db.CreateMemoryParams{
		LoungeID:     pgtype.UUID{Bytes: loungeID, Valid: true},
		AuthorUserID: authorUserID,
		Text:         text,
		PhotoUrl:     textFromPtr(photoURL),
	})
	if err != nil {
		return nil, err
	}
	return memoryRowToAPI(row), nil
}

func (s *memoryService) ListByLounge(ctx context.Context, loungeID openapi_types.UUID, limit int32) ([]Memory, error) {
	q := db.New(s.pool)
	rows, err := q.ListMemoriesByLounge(ctx, db.ListMemoriesByLoungeParams{
		LoungeID: pgtype.UUID{Bytes: loungeID, Valid: true},
		Limit:    limit,
	})
	if err != nil {
		return nil, err
	}
	result := make([]Memory, len(rows))
	for i, row := range rows {
		result[i] = *memoryRowToAPI(row)
	}
	return result, nil
}

// SoftDelete: 본인만 — author_user_id 일치 검증을 쿼리 WHERE에 포함.
// 영향 행수 0 → 존재 확인을 위해 GetMemoryByID 별도 호출 후 author 불일치면 ErrForbidden,
// 아니면 ErrNotFound. (race 확률 낮으나 권한·404를 정확히 구분하기 위해.)
func (s *memoryService) SoftDelete(ctx context.Context, memoryID openapi_types.UUID, authorUserID pgtype.UUID) error {
	q := db.New(s.pool)
	mpg := pgtype.UUID{Bytes: memoryID, Valid: true}

	affected, err := q.SoftDeleteMemory(ctx, db.SoftDeleteMemoryParams{
		ID:           mpg,
		AuthorUserID: authorUserID,
	})
	if err != nil {
		return err
	}
	if affected > 0 {
		return nil
	}

	row, err := q.GetMemoryByID(ctx, mpg)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if row.AuthorUserID.Bytes != authorUserID.Bytes {
		return ErrForbidden
	}
	// 권한 일치인데도 0행 = 이미 삭제됨 → 404 취급.
	return ErrNotFound
}

func memoryRowToAPI(row db.V3Memory) *Memory {
	m := &Memory{
		Id:           uuidToOpenapi(row.ID),
		LoungeId:     uuidToOpenapi(row.LoungeID),
		AuthorUserId: uuidToOpenapi(row.AuthorUserID),
		Text:         row.Text,
		CreatedAt:    row.CreatedAt.Time,
	}
	if row.PhotoUrl.Valid {
		s := row.PhotoUrl.String
		m.PhotoUrl = &s
	}
	return m
}
