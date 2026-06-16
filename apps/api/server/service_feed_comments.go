package api

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

type feedCommentService struct {
	pool *pgxpool.Pool
}

func NewFeedCommentService(pool *pgxpool.Pool) FeedCommentService {
	return &feedCommentService{pool: pool}
}

func (s *feedCommentService) Create(ctx context.Context, userID openapi_types.UUID, req *CreateFeedCommentRequest) (*FeedComment, error) {
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}
	pgTargetID := pgtype.UUID{Bytes: req.TargetId, Valid: true}
	targetType := string(req.TargetType)

	var (
		id        pgtype.UUID
		createdAt pgtype.Timestamptz
		userName  string
	)

	err := s.pool.QueryRow(ctx,
		`WITH inserted AS (
			INSERT INTO v3_feed_comments (user_id, target_type, target_id, message)
			VALUES ($1, $2, $3, $4)
			RETURNING id, user_id, target_type, target_id, message, created_at
		)
		SELECT i.id, i.created_at, u.name
		FROM inserted i
		JOIN v3_users u ON u.id = i.user_id`,
		pgUserID, targetType, pgTargetID, req.Message,
	).Scan(&id, &createdAt, &userName)
	if err != nil {
		return nil, err
	}

	return &FeedComment{
		Id:         uuidToOpenapi(id),
		UserId:     userID,
		UserName:   userName,
		TargetType: FeedCommentTargetType(targetType),
		TargetId:   req.TargetId,
		Message:    req.Message,
		CreatedAt:  createdAt.Time,
	}, nil
}

func (s *feedCommentService) List(ctx context.Context, targetType string, targetID openapi_types.UUID, cursor *string, limit int) ([]FeedComment, bool, *string, error) {
	pgTargetID := pgtype.UUID{Bytes: targetID, Valid: true}

	query := `SELECT c.id, c.user_id, c.target_type, c.target_id, c.message, c.created_at, u.name
		FROM v3_feed_comments c
		JOIN v3_users u ON u.id = c.user_id
		WHERE c.target_type = $1 AND c.target_id = $2 AND c.deleted_at IS NULL`
	args := []interface{}{targetType, pgTargetID}

	if cursor != nil {
		t, err := time.Parse(time.RFC3339Nano, *cursor)
		if err == nil {
			query += ` AND c.created_at < $3 ORDER BY c.created_at DESC LIMIT $4`
			args = append(args, pgtype.Timestamptz{Time: t, Valid: true}, limit+1)
		} else {
			query += ` ORDER BY c.created_at DESC LIMIT $3`
			args = append(args, limit+1)
		}
	} else {
		query += ` ORDER BY c.created_at DESC LIMIT $3`
		args = append(args, limit+1)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, false, nil, err
	}
	defer rows.Close()

	var comments []FeedComment
	for rows.Next() {
		var (
			id         pgtype.UUID
			userID     pgtype.UUID
			tt         string
			tid        pgtype.UUID
			message    string
			createdAt  pgtype.Timestamptz
			userName   string
		)
		if err := rows.Scan(&id, &userID, &tt, &tid, &message, &createdAt, &userName); err != nil {
			return nil, false, nil, err
		}

		comments = append(comments, FeedComment{
			Id:         uuidToOpenapi(id),
			UserId:     uuidToOpenapi(userID),
			UserName:   userName,
			TargetType: FeedCommentTargetType(tt),
			TargetId:   uuidToOpenapi(tid),
			Message:    message,
			CreatedAt:  createdAt.Time,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, false, nil, err
	}

	hasMore := len(comments) > limit
	if hasMore {
		comments = comments[:limit]
	}

	var nextCursor *string
	if hasMore && len(comments) > 0 {
		c := comments[len(comments)-1].CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &c
	}

	return comments, hasMore, nextCursor, nil
}

func (s *feedCommentService) Delete(ctx context.Context, commentID openapi_types.UUID, userID openapi_types.UUID) error {
	pgCommentID := pgtype.UUID{Bytes: commentID, Valid: true}
	pgUserID := pgtype.UUID{Bytes: userID, Valid: true}

	// Fetch the comment to check ownership.
	var ownerID pgtype.UUID
	err := s.pool.QueryRow(ctx,
		`SELECT user_id FROM v3_feed_comments WHERE id = $1 AND deleted_at IS NULL`,
		pgCommentID,
	).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ErrNotFound
		}
		return err
	}

	if ownerID != pgUserID {
		return ErrForbidden
	}

	// Soft delete.
	_, err = s.pool.Exec(ctx,
		`UPDATE v3_feed_comments SET deleted_at = now() WHERE id = $1`,
		pgCommentID,
	)
	return err
}
