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

type userService struct {
	pool *pgxpool.Pool
}

func NewUserService(pool *pgxpool.Pool) UserService {
	return &userService{pool: pool}
}

func (s *userService) GetByID(ctx context.Context, id pgtype.UUID) (*User, error) {
	q := db.New(s.pool)
	user, err := q.GetUserByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return dbUserToAPI(user), nil
}

func (s *userService) Update(ctx context.Context, id pgtype.UUID, req *UpdateUserRequest) (*User, error) {
	q := db.New(s.pool)

	params := db.UpdateUserParams{ID: id}
	if req.Name != nil {
		params.Name = pgtype.Text{String: *req.Name, Valid: true}
	}
	if req.Phone != nil {
		params.Phone = pgtype.Text{String: *req.Phone, Valid: true}
	}
	if req.ProfileImageUrl != nil {
		params.ProfileImageUrl = pgtype.Text{String: *req.ProfileImageUrl, Valid: true}
	}

	user, err := q.UpdateUser(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return dbUserToAPI(user), nil
}

// EnsureUser: JIT 프로비저닝. v3_users 행을 멱등 보장(ON CONFLICT DO NOTHING).
// name은 NOT NULL이므로 호출부(미들웨어)에서 deriveDisplayName으로 비지 않게 보장한다.
func (s *userService) EnsureUser(ctx context.Context, id pgtype.UUID, email, name string) error {
	// user + moi를 한 트랜잭션에서 멱등 동반 생성(둘 다 ON CONFLICT DO NOTHING).
	// FK(v3_mois.user_id→v3_users.id) 때문에 user 먼저, moi 나중.
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	q := db.New(tx)
	if err := q.EnsureUser(ctx, db.EnsureUserParams{ID: id, Name: name, Email: email}); err != nil {
		return err
	}
	if err := q.EnsureMoi(ctx, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func dbUserToAPI(u db.V3User) *User {
	return &User{
		Id:              uuidToOpenapi(u.ID),
		Name:            u.Name,
		Email:           openapi_types.Email(u.Email),
		Phone:           ptrFromText(u.Phone),
		ProfileImageUrl: ptrFromText(u.ProfileImageUrl),
		CreatedAt:       u.CreatedAt.Time,
	}
}
