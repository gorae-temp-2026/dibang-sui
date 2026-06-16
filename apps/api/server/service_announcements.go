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

type announcementService struct {
	pool *pgxpool.Pool
}

func NewAnnouncementService(pool *pgxpool.Pool) AnnouncementService {
	return &announcementService{pool: pool}
}

func (s *announcementService) Create(ctx context.Context, loungeID openapi_types.UUID, hostID pgtype.UUID, req *CreateAnnouncementRequest) (*Announcement, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := db.New(tx)

	// 단일 공지 유지: 기존 공지 전부 soft delete
	if err := q.SoftDeleteAllAnnouncements(ctx, pgtype.UUID{Bytes: loungeID, Valid: true}); err != nil {
		return nil, err
	}

	// 새 공지는 항상 pinned
	row, err := q.InsertAnnouncement(ctx, db.InsertAnnouncementParams{
		LoungeID: pgtype.UUID{Bytes: loungeID, Valid: true},
		HostID:   hostID,
		Message:  req.Message,
		IsPinned: true,
	})
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return toAnnouncement(row), nil
}

func (s *announcementService) List(ctx context.Context, loungeID openapi_types.UUID, cursor *string, limit int) ([]Announcement, bool, *string, error) {
	q := db.New(s.pool)

	var cursorTs pgtype.Timestamptz
	if cursor != nil {
		t, err := time.Parse(time.RFC3339Nano, *cursor)
		if err == nil {
			cursorTs = pgtype.Timestamptz{Time: t, Valid: true}
		}
	}

	fetchLimit := int32(limit + 1)

	rows, err := q.ListAnnouncements(ctx, db.ListAnnouncementsParams{
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

	entries := make([]Announcement, len(rows))
	for i, row := range rows {
		entries[i] = *toAnnouncement(row)
	}

	var nextCursor *string
	if hasMore && len(entries) > 0 {
		last := entries[len(entries)-1]
		c := last.CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &c
	}

	return entries, hasMore, nextCursor, nil
}

func (s *announcementService) GetByID(ctx context.Context, id openapi_types.UUID) (*Announcement, error) {
	q := db.New(s.pool)

	row, err := q.GetAnnouncementByID(ctx, pgtype.UUID{Bytes: id, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return toAnnouncement(row), nil
}

func (s *announcementService) Update(ctx context.Context, id openapi_types.UUID, req *UpdateAnnouncementRequest) (*Announcement, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := db.New(tx)

	// If pinning, unpin all existing pinned announcements in the same lounge first.
	if req.IsPinned != nil && *req.IsPinned {
		// Get the announcement to find its lounge_id.
		existing, err := q.GetAnnouncementByID(ctx, pgtype.UUID{Bytes: id, Valid: true})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrNotFound
			}
			return nil, err
		}
		if err := q.UnpinAllAnnouncements(ctx, existing.LoungeID); err != nil {
			return nil, err
		}
	}

	row, err := q.UpdateAnnouncement(ctx, db.UpdateAnnouncementParams{
		ID:       pgtype.UUID{Bytes: id, Valid: true},
		Message:  textFromPtr(req.Message),
		IsPinned: boolFromPtr(req.IsPinned),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return toAnnouncement(row), nil
}

func (s *announcementService) SoftDelete(ctx context.Context, id openapi_types.UUID) error {
	q := db.New(s.pool)
	return q.SoftDeleteAnnouncement(ctx, pgtype.UUID{Bytes: id, Valid: true})
}

func (s *announcementService) GetWeddingIDByLoungeID(ctx context.Context, loungeID openapi_types.UUID) (openapi_types.UUID, error) {
	q := db.New(s.pool)

	weddingID, err := q.GetWeddingIDByLoungeID(ctx, pgtype.UUID{Bytes: loungeID, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi_types.UUID{}, ErrNotFound
		}
		return openapi_types.UUID{}, err
	}

	return uuidToOpenapi(weddingID), nil
}

func toAnnouncement(row db.V3HostAnnouncement) *Announcement {
	a := &Announcement{
		Id:        uuidToOpenapi(row.ID),
		LoungeId:  uuidToOpenapi(row.LoungeID),
		HostId:    uuidToOpenapi(row.HostID),
		Message:   row.Message,
		IsPinned:  row.IsPinned,
		CreatedAt: row.CreatedAt.Time,
	}
	if row.UpdatedAt.Valid {
		t := row.UpdatedAt.Time
		a.UpdatedAt = &t
	}
	return a
}

func boolFromPtr(b *bool) pgtype.Bool {
	if b == nil {
		return pgtype.Bool{Valid: false}
	}
	return pgtype.Bool{Bool: *b, Valid: true}
}
