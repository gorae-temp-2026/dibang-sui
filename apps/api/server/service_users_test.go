package api

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// 스코프드 통합 테스트: 실데이터 truncate 금지 — 임의 테스트 UUID로 user+moi 생성/검증 후
// 그 행만 정리. 로컬 DB 미가용 시 skip(파괴적 인프라 미도입).
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
	}
	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Skipf("no test DB: %v", err)
	}
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Skipf("test DB unreachable: %v", err)
	}
	return pool
}

// EnsureUser 호출 시 v3_users + v3_mois를 멱등 동반 생성해야 한다.
func TestEnsureUserProvisionsUserAndMoi(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	defer pool.Close()

	u := uuid.New()
	id := pgtype.UUID{Bytes: u, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_mois WHERE user_id = $1`, id)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = $1`, id)
	})

	svc := NewUserService(pool)
	require.NoError(t, svc.EnsureUser(ctx, id, "jit-"+u.String()+"@example.com", "JIT 테스트"))

	var users, mois int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM v3_users WHERE id = $1`, id).Scan(&users))
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM v3_mois WHERE user_id = $1`, id).Scan(&mois))
	assert.Equal(t, 1, users, "v3_users 행 생성")
	assert.Equal(t, 1, mois, "v3_mois 행 동반 생성")

	// 멱등: 재호출해도 에러 없고 중복 없음
	require.NoError(t, svc.EnsureUser(ctx, id, "jit-"+u.String()+"@example.com", "JIT 테스트"))
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM v3_mois WHERE user_id = $1`, id).Scan(&mois))
	assert.Equal(t, 1, mois, "재호출 후에도 v3_mois 1행(멱등)")
}
