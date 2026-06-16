package api

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type feedHeartService struct {
	pool *pgxpool.Pool
}

func NewFeedHeartService(pool *pgxpool.Pool) FeedHeartService {
	return &feedHeartService{pool: pool}
}

func (s *feedHeartService) Toggle(ctx context.Context, userID openapi_types.UUID, targetType string, targetID openapi_types.UUID) (bool, int, error) {
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}
	pgTargetID := pgtype.UUID{Bytes: targetID, Valid: true}

	// Check if heart already exists.
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM v3_feed_hearts WHERE user_id = $1 AND target_type = $2 AND target_id = $3)`,
		pgUserID, targetType, pgTargetID,
	).Scan(&exists)
	if err != nil {
		return false, 0, err
	}

	if exists {
		// Remove heart.
		_, err = s.pool.Exec(ctx,
			`DELETE FROM v3_feed_hearts WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
			pgUserID, targetType, pgTargetID,
		)
		if err != nil {
			return false, 0, err
		}
	} else {
		// Add heart.
		_, err = s.pool.Exec(ctx,
			`INSERT INTO v3_feed_hearts (user_id, target_type, target_id) VALUES ($1, $2, $3)`,
			pgUserID, targetType, pgTargetID,
		)
		if err != nil {
			return false, 0, err
		}
	}

	// Count current hearts.
	var count int
	err = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM v3_feed_hearts WHERE target_type = $1 AND target_id = $2`,
		targetType, pgTargetID,
	).Scan(&count)
	if err != nil {
		return false, 0, err
	}

	return !exists, count, nil
}
