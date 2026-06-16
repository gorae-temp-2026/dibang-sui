package api

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// P1: 게스트 플로우에서 만든 GuestbookEntry id를 축의 생성 시 함께 받아
// v3_cash_gifts.guestbook_entry_id에 영속해야 한다(이후 attended 도출의 기준).
// 픽스처는 raw SQL로 임의 UUID 행만 생성/정리(truncate 금지, 실데이터 보존).
// 로컬 DB 미가용 시 testPool이 skip.
func TestCashGiftService_Create_PersistsGuestbookEntryID(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	wid := uuid.New()
	lid := uuid.New()
	eid := uuid.New()
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	lpg := pgtype.UUID{Bytes: lid, Valid: true}
	epg := pgtype.UUID{Bytes: eid, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_cash_gifts WHERE wedding_id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_guestbook_entries WHERE lounge_id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_wedding_lounges WHERE id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
	})

	_, err := pool.Exec(ctx, `
		INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address)
		VALUES ($1, '신랑', '신부', DATE '2026-01-01', '12:00', '홀', '주소')`, wpg)
	require.NoError(t, err, "픽스처 wedding 생성")
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_wedding_lounges (id, wedding_id, name) VALUES ($1, $2, '라운지')`, lpg, wpg)
	require.NoError(t, err, "픽스처 lounge 생성")
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_guestbook_entries (id, lounge_id, guest_name, recipient_slot, relation_category)
		VALUES ($1, $2, '김친구', 'groom', '직장동료')`, epg, lpg)
	require.NoError(t, err, "픽스처 guestbook entry 생성")

	svc := NewCashGiftService(pool)
	entryID := openapi_types.UUID(eid)
	req := &CreateCashGiftRequest{
		WeddingId:        openapi_types.UUID(wid),
		GuestName:        "김친구",
		RecipientSlot:    CreateCashGiftRequestRecipientSlot("groom"),
		RelationCategory: CreateCashGiftRequestRelationCategory("직장동료"),
		Amount:           200000,
		PayMethod:        CreateCashGiftRequestPayMethod("transfer"),
		GuestbookEntryId: &entryID,
	}

	got, err := svc.Create(ctx, req)
	require.NoError(t, err, "Create 성공")
	require.NotNil(t, got)
	require.NotNil(t, got.GuestbookEntryId, "응답에 guestbook_entry_id가 설정돼야 함")
	assert.Equal(t, entryID, *got.GuestbookEntryId, "전달한 entry id가 그대로 반영")

	// P2: guestbook_entry_id가 이 결혼식 라운지의 엔트리를 가리키므로 attended=true 도출
	require.NotNil(t, got.Attended, "attended 도출값 존재")
	assert.True(t, *got.Attended, "연결된 GuestbookEntry가 있으므로 참석(true)")

	var dbEntry pgtype.UUID
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT guestbook_entry_id FROM v3_cash_gifts WHERE id = $1`,
		pgtype.UUID{Bytes: got.Id, Valid: true}).Scan(&dbEntry))
	assert.True(t, dbEntry.Valid, "DB 행에 guestbook_entry_id가 영속됨")
	assert.Equal(t, eid, uuid.UUID(dbEntry.Bytes), "DB 값이 전달한 entry id와 일치")
}

// P2: guestbook_entry_id 미연결(호스트 수기 입력 류)은 attended=false 여야 한다.
func TestCashGiftService_Create_UnlinkedIsNotAttended(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	wid := uuid.New()
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_cash_gifts WHERE wedding_id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
	})
	_, err := pool.Exec(ctx, `
		INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address)
		VALUES ($1, '신랑', '신부', DATE '2026-01-01', '12:00', '홀', '주소')`, wpg)
	require.NoError(t, err, "픽스처 wedding 생성")

	svc := NewCashGiftService(pool)
	got, err := svc.Create(ctx, &CreateCashGiftRequest{
		WeddingId:        openapi_types.UUID(wid),
		GuestName:        "수기입력",
		RecipientSlot:    CreateCashGiftRequestRecipientSlot("groom"),
		RelationCategory: CreateCashGiftRequestRelationCategory("기타모임"),
		Amount:           50000,
		PayMethod:        CreateCashGiftRequestPayMethod("cash"),
		// GuestbookEntryId 없음 (호스트 수기 입력 시나리오)
	})
	require.NoError(t, err, "Create 성공")
	require.NotNil(t, got)
	assert.Nil(t, got.GuestbookEntryId, "미연결이면 guestbook_entry_id 없음")
	require.NotNil(t, got.Attended)
	assert.False(t, *got.Attended, "연결된 GuestbookEntry가 없으므로 불참(false)")
}
