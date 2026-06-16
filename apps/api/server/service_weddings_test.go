package api

import (
	"context"
	"testing"
	"time"

	"gorae-api/db"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// getWedding(public, GetByID) 응답의 lounge에 라운지 측별 하객 수가 실리는지 검증.
// GetWeddingFull 행의 groom/bride_side_guest_count가 LoungeSummary로 그대로 매핑되어야 한다.
// 순수 매핑 함수라 DB 없이 단위로 검증한다(매핑 누락 시 0이 나와 RED).
func TestDbWeddingFullToAPI_GuestSideCounts(t *testing.T) {
	row := db.GetWeddingFullRow{
		GroomSideGuestCount: 3,
		BrideSideGuestCount: 5,
	}

	w := dbWeddingFullToAPI(row, nil)

	require.NotNil(t, w)
	assert.Equal(t, 3, w.Lounge.GroomSideGuestCount, "신랑측 하객 수 매핑")
	assert.Equal(t, 5, w.Lounge.BrideSideGuestCount, "신부측 하객 수 매핑")
}

// 회귀: DATABASE_URL이 simple_protocol(Supabase 트랜잭션 풀러)일 때,
// UpdateWeddingInfo의 jsonb 계좌 컬럼을 COALESCE($n, col)로 갱신하면
// pgx가 []byte 파라미터를 bytea로 인코딩 → COALESCE(bytea, jsonb) 타입
// 불일치(SQLSTATE 42846)로 쿼리가 깨지던 버그.
//
// 픽스처는 raw SQL(::jsonb 명시)로 직접 생성해 Create/InsertWedding의
// 동작과 무관하게 Update 경로만 격리 검증한다. 실데이터 truncate 없이
// 임의 UUID 행만 t.Cleanup으로 정리한다(service_users_test.go 패턴).
func TestWeddingService_Update_JSONBAccount(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	// 정리 순서 보장: t.Cleanup은 LIFO. pool.Close를 먼저 등록(= 가장 나중 실행),
	// DELETE를 나중 등록(= 먼저 실행)해 닫힌 풀에서 DELETE되는 일을 막는다.
	t.Cleanup(func() { pool.Close() })

	wid := uuid.New()
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
	})

	_, err := pool.Exec(ctx, `
		INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address)
		VALUES ($1, '테스트신랑', '테스트신부', DATE '2026-01-01', '12:00', '테스트홀', '테스트주소')`, wpg)
	require.NoError(t, err, "픽스처 wedding 생성")

	svc := NewWeddingService(pool, NewInvitationService(pool))

	bank := "토스뱅크"
	addr := "11101001010"
	updated, err := svc.Update(ctx, openapi_types.UUID(wid), &UpdateWeddingRequest{
		Info: &WeddingInfo{
			GroomName:    "변경신랑",
			BrideName:    "변경신부",
			Date:         openapi_types.Date{Time: time.Date(2026, 2, 2, 0, 0, 0, 0, time.UTC)},
			Time:         "13:00",
			Venue:        Venue{VenueName: "변경홀", VenueAddress: "변경주소"},
			GroomAccount: &Account{Bank: &bank, Address: &addr},
		},
	})

	// FIX 전: 여기서 SQLSTATE 42846으로 실패(RED).
	// FIX 후: jsonb 캐스트로 정상 갱신(GREEN).
	require.NoError(t, err, "jsonb 계좌 포함 Update가 42846 없이 성공해야 한다")
	require.NotNil(t, updated)
	assert.Equal(t, "변경신랑", updated.Info.GroomName)
	require.NotNil(t, updated.Info.GroomAccount)
	assert.Equal(t, "토스뱅크", *updated.Info.GroomAccount.Bank)
	assert.Equal(t, "11101001010", *updated.Info.GroomAccount.Address)
}
