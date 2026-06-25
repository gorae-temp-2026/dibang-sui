package api

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// admin write 전용 도메인 에러 (ErrConflict은 service.go로 이동).
var (
	ErrValidation = errors.New("validation failed") // → 400
)

// adminMutationService는 /admin/* 의 수정·삭제를 처리한다.
// 권한은 AdminGuard 미들웨어가 막으므로 여기선 권한검증 없음. 모든 변경은 audit에 남긴다.
type adminMutationService struct {
	pool  *pgxpool.Pool
	audit AuditLogger
}

func NewAdminMutationService(pool *pgxpool.Pool, audit AuditLogger) *adminMutationService {
	return &adminMutationService{pool: pool, audit: audit}
}

// finishMutation: sqlc 결과(rows, err)를 도메인 에러로 환산하고 성공 시 감사 기록.
//   - err != nil      → pg 에러 매핑(Conflict/Validation/…)
//   - rows == 0       → ErrNotFound (대상 없음 / 이미 삭제됨)
//   - 그 외           → audit.Record (감사 실패 시 그 에러 전파 — 조용한 누락 방지)
func (s *adminMutationService) finishMutation(ctx context.Context, rows int64, err error, e AuditEntry) error {
	if err != nil {
		return mapPgError(err)
	}
	if rows == 0 {
		return ErrNotFound
	}
	return s.audit.Record(ctx, e)
}

// mapPgError: Postgres 제약 위반을 도메인 에러로 환산.
func mapPgError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505": // unique_violation
			return ErrConflict
		case "23514", "23503", "22P02", "22001": // check / fk / invalid_text / string_too_long
			return ErrValidation
		}
	}
	return err
}
