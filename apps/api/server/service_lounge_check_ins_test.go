package api

import (
	"context"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// AUD-7: LoungeCheckIn = 한 user당 한 lounge에 1건(하객 정체성/멤버십).
// DB UNIQUE(user_id, lounge_id) + InsertLoungeCheckIn ON CONFLICT DO NOTHING +
// 충돌 시 재조회로 race-safe get-or-create를 보장한다.
//
// 픽스처는 raw SQL로 직접 생성, 임의 UUID 행만 정리(truncate 금지, 실데이터 보존).
// 로컬 DB 미가용 시 testPool이 skip.

// 순차 2회 Create는 멱등해야 한다(같은 entry, DB 1행).
func TestLoungeCheckInService_Create_Idempotent(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	uid := uuid.New()
	wid := uuid.New()
	lid := uuid.New()
	upg := pgtype.UUID{Bytes: uid, Valid: true}
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	lpg := pgtype.UUID{Bytes: lid, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_lounge_check_ins WHERE lounge_id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_wedding_lounges WHERE id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = $1`, upg)
	})

	_, err := pool.Exec(ctx, `
		INSERT INTO v3_users (id, name, email) VALUES ($1, '입장테스트', $2)`,
		upg, "lounge-check-in-"+uid.String()+"@example.com")
	require.NoError(t, err, "픽스처 user 생성")
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address)
		VALUES ($1, '신랑', '신부', DATE '2026-01-01', '12:00', '홀', '주소')`, wpg)
	require.NoError(t, err, "픽스처 wedding 생성")
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_wedding_lounges (id, wedding_id, name) VALUES ($1, $2, '라운지')`, lpg, wpg)
	require.NoError(t, err, "픽스처 lounge 생성")

	svc := NewLoungeCheckInService(pool)
	loungeID := openapi_types.UUID(lid)
	userID := openapi_types.UUID(uid)

	first, err := svc.Create(ctx, loungeID, userID, nil)
	require.NoError(t, err, "1회차 Create 성공")
	require.NotNil(t, first)

	second, err := svc.Create(ctx, loungeID, userID, nil)
	require.NoError(t, err, "2회차 Create는 기존 행을 멱등 반환")
	require.NotNil(t, second)
	assert.Equal(t, first.Id, second.Id, "같은 (user,lounge)는 같은 entry")

	var n int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT count(*) FROM v3_lounge_check_ins WHERE user_id = $1 AND lounge_id = $2`,
		upg, lpg).Scan(&n))
	assert.Equal(t, 1, n, "DB에 정확히 1행")
}

// 동시 Create N개는 모두 성공하고 단 1행만 남아야 한다(race-safe).
// 현재 InsertLoungeCheckIn에 ON CONFLICT가 없으면 일부가 UNIQUE violation으로
// 실패 → RED. ON CONFLICT DO NOTHING + 재조회 fallback이면 모두 성공 → GREEN.
func TestLoungeCheckInService_Create_ConcurrentNoDuplicate(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	uid := uuid.New()
	wid := uuid.New()
	lid := uuid.New()
	upg := pgtype.UUID{Bytes: uid, Valid: true}
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	lpg := pgtype.UUID{Bytes: lid, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_lounge_check_ins WHERE lounge_id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_wedding_lounges WHERE id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = $1`, upg)
	})

	_, err := pool.Exec(ctx, `
		INSERT INTO v3_users (id, name, email) VALUES ($1, '동시입장', $2)`,
		upg, "lounge-race-"+uid.String()+"@example.com")
	require.NoError(t, err, "픽스처 user 생성")
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address)
		VALUES ($1, '신랑', '신부', DATE '2026-01-01', '12:00', '홀', '주소')`, wpg)
	require.NoError(t, err, "픽스처 wedding 생성")
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_wedding_lounges (id, wedding_id, name) VALUES ($1, $2, '라운지')`, lpg, wpg)
	require.NoError(t, err, "픽스처 lounge 생성")

	svc := NewLoungeCheckInService(pool)
	loungeID := openapi_types.UUID(lid)
	userID := openapi_types.UUID(uid)

	const concurrency = 8
	var wg sync.WaitGroup
	start := make(chan struct{})
	errs := make([]error, concurrency)
	ids := make([]openapi_types.UUID, concurrency)
	for i := range concurrency {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			<-start // 동시에 출발해 Step1(존재확인) 통과를 겹치게 함
			e, err := svc.Create(ctx, loungeID, userID, nil)
			errs[idx] = err
			if e != nil {
				ids[idx] = e.Id
			}
		}(i)
	}
	close(start)
	wg.Wait()

	for i, err := range errs {
		require.NoErrorf(t, err, "goroutine %d: 동시 Create는 UNIQUE violation 없이 성공해야 한다", i)
	}
	for i := 1; i < concurrency; i++ {
		assert.Equalf(t, ids[0], ids[i], "goroutine %d: 모두 같은 entry를 받아야 한다", i)
	}

	var n int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT count(*) FROM v3_lounge_check_ins WHERE user_id = $1 AND lounge_id = $2`,
		upg, lpg).Scan(&n))
	assert.Equal(t, 1, n, "동시 입장에도 DB에 정확히 1행")
}

// 입장만 하고 누구측·관계를 채우지 않은 사용자(LoungeCheckIn.recipient_slot 등 NULL)가
// 한 명이라도 있는 라운지에서 List가 sqlc scan 에러("cannot scan NULL into *string")로
// 죽지 않아야 한다. ListLoungeCheckIns 쿼리의 COALESCE(le.x, ge.x) 결과는 양쪽 모두
// NULL이면 NULL이며, 도메인상 LoungeCheckIn의 recipient_slot·relation_category·
// relation_detail은 nullable(DOMAIN_MODEL_SUMMARY LoungeCheckIn invariants)이다.
func TestLoungeCheckInService_List_NullRecipientSlot(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	uid := uuid.New()
	wid := uuid.New()
	lid := uuid.New()
	pid := uuid.New()
	upg := pgtype.UUID{Bytes: uid, Valid: true}
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	lpg := pgtype.UUID{Bytes: lid, Valid: true}
	ppg := pgtype.UUID{Bytes: pid, Valid: true}

	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_lounge_check_ins WHERE lounge_id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_moi_gather_places WHERE id = $1`, ppg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_wedding_lounges WHERE id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = $1`, upg)
	})

	_, err := pool.Exec(ctx, `
		INSERT INTO v3_users (id, name, email) VALUES ($1, '입장만한사람', $2)`,
		upg, "lounge-list-null-"+uid.String()+"@example.com")
	require.NoError(t, err, "픽스처 user 생성")
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address)
		VALUES ($1, '신랑', '신부', DATE '2026-01-01', '12:00', '홀', '주소')`, wpg)
	require.NoError(t, err, "픽스처 wedding 생성")
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_wedding_lounges (id, wedding_id, name) VALUES ($1, $2, '라운지')`, lpg, wpg)
	require.NoError(t, err, "픽스처 lounge 생성")
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_moi_gather_places (id, lounge_id, type) VALUES ($1, $2, 'default')`, ppg, lpg)
	require.NoError(t, err, "픽스처 gather_place 생성")

	// 입장만 했고 GuestbookEntry는 없어, COALESCE 폴백도 NULL이 되도록 셋업.
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_lounge_check_ins (user_id, lounge_id, visitor_name)
		VALUES ($1, $2, '입장만한사람')`, upg, lpg)
	require.NoError(t, err, "NULL slot 입장 픽스처")

	svc := NewLoungeCheckInService(pool)
	placeID := openapi_types.UUID(pid)

	entries, hasMore, nextCursor, err := svc.List(ctx, placeID, nil, 20)
	require.NoError(t, err, "NULL recipient_slot 행이 있어도 List는 성공해야 한다")
	assert.False(t, hasMore)
	assert.Nil(t, nextCursor)
	require.Len(t, entries, 1, "입장 1건")
	assert.Nil(t, entries[0].RecipientSlot, "NULL이면 응답도 nil")
	assert.Nil(t, entries[0].RelationCategory, "NULL이면 응답도 nil")
	assert.Nil(t, entries[0].RelationDetail, "NULL이면 응답도 nil")
}
