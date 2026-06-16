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

// FEED-3: 피드 글(GuestbookMessage 확장) photo_url 저장 + 조회 기록.
// DISPLAY-PORT: lounge_id 비정규화 컬럼 자동 채움(Realtime 구독 필터용).
// 픽스처는 raw SQL로 직접 생성, 임의 UUID 행만 정리(truncate 금지).
// v3_guestbook_entries 삭제 시 messages·message_views가 ON DELETE CASCADE로 정리됨.

// DISPLAY-PORT: CreateMessage 시 새 row의 lounge_id가 부모 entry의 lounge_id와
// 동일하게 채워져야 한다. mecdisplay Realtime 구독(`filter:lounge_id=eq.X`)의 전제.
// 채움 전략(SCENARIOS §2): 백엔드 service/쿼리가 INSERT 시 entry에서 조회해 명시 구성.
func TestGuestbookService_CreateMessage_PopulatesLoungeID(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	authorID := uuid.New()
	wid := uuid.New()
	lid := uuid.New()
	eid := uuid.New()
	apg := pgtype.UUID{Bytes: authorID, Valid: true}
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	lpg := pgtype.UUID{Bytes: lid, Valid: true}
	epg := pgtype.UUID{Bytes: eid, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_guestbook_entries WHERE id = $1`, epg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_wedding_lounges WHERE id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = $1`, apg)
	})

	_, err := pool.Exec(ctx, `INSERT INTO v3_users (id, name, email) VALUES ($1,'작성자',$2)`,
		apg, "lounge-author-"+authorID.String()+"@example.com")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address) VALUES ($1,'신랑','신부',DATE '2026-01-01','12:00','홀','주소')`, wpg)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO v3_wedding_lounges (id, wedding_id, name) VALUES ($1,$2,'라운지')`, lpg, wpg)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO v3_guestbook_entries (id, lounge_id, guest_name, guest_id, recipient_slot, relation_category) VALUES ($1,$2,'작성자',$3,'groom','친구/지인')`, epg, lpg, apg)
	require.NoError(t, err)

	svc := NewGuestbookService(pool)
	msg, err := svc.CreateMessage(ctx, openapi_types.UUID(eid), &CreateGuestbookMessageRequest{Message: "lounge_id 자동 채움 검증"})
	require.NoError(t, err)
	require.NotEqual(t, uuid.Nil, uuid.UUID(msg.Id))

	// DB에서 lounge_id가 entry의 lounge_id와 동일하게 채워졌는지 확인.
	var actualLoungeID pgtype.UUID
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT lounge_id FROM v3_guestbook_messages WHERE id = $1`,
		pgtype.UUID{Bytes: msg.Id, Valid: true}).Scan(&actualLoungeID))
	require.True(t, actualLoungeID.Valid, "lounge_id는 NOT NULL")
	assert.Equal(t, lpg.Bytes, actualLoungeID.Bytes, "messages.lounge_id가 부모 entry.lounge_id와 일치해야 한다")
}

// GuestbookMessage는 LIVE 축하메세지(현장 QR) text-only로 책임 환원 — photo_url 제거됨.
// 사진은 v3_memories 도메인이 담당(_scenario/memory-domain-split/SCENARIOS.md).
// 본 테스트는 도메인 분리 후 obsolete — 삭제.

// 조회 기록: 타인 1회/멱등, 작성자 본인 제외, 미존재 404.
func TestGuestbookService_RecordMessageView(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	authorID := uuid.New()
	viewerID := uuid.New()
	wid := uuid.New()
	lid := uuid.New()
	eid := uuid.New()
	apg := pgtype.UUID{Bytes: authorID, Valid: true}
	vpg := pgtype.UUID{Bytes: viewerID, Valid: true}
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	lpg := pgtype.UUID{Bytes: lid, Valid: true}
	epg := pgtype.UUID{Bytes: eid, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_guestbook_entries WHERE id = $1`, epg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_wedding_lounges WHERE id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = ANY($1)`, []pgtype.UUID{apg, vpg})
	})

	_, err := pool.Exec(ctx, `INSERT INTO v3_users (id, name, email) VALUES ($1,'작성자',$2),($3,'조회자',$4)`,
		apg, "v-author-"+authorID.String()+"@example.com", vpg, "v-viewer-"+viewerID.String()+"@example.com")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address) VALUES ($1,'신랑','신부',DATE '2026-01-01','12:00','홀','주소')`, wpg)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO v3_wedding_lounges (id, wedding_id, name) VALUES ($1,$2,'라운지')`, lpg, wpg)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO v3_guestbook_entries (id, lounge_id, guest_name, guest_id, recipient_slot, relation_category) VALUES ($1,$2,'작성자',$3,'groom','친구/지인')`, epg, lpg, apg)
	require.NoError(t, err)

	svc := NewGuestbookService(pool)
	msg, err := svc.CreateMessage(ctx, openapi_types.UUID(eid), &CreateGuestbookMessageRequest{Message: "조회 대상 글"})
	require.NoError(t, err)
	msgID := msg.Id

	count := func() int {
		var n int
		require.NoError(t, pool.QueryRow(ctx,
			`SELECT count(*) FROM v3_guestbook_message_views WHERE guestbook_message_id = $1`,
			pgtype.UUID{Bytes: msgID, Valid: true}).Scan(&n))
		return n
	}

	// 타인 조회 → 1건
	require.NoError(t, svc.RecordMessageView(ctx, msgID, vpg))
	assert.Equal(t, 1, count(), "타인 조회는 기록")

	// 동일 조회자 재조회 → 멱등(1건 유지)
	require.NoError(t, svc.RecordMessageView(ctx, msgID, vpg))
	assert.Equal(t, 1, count(), "중복 조회는 멱등")

	// 작성자 본인 → 기록 제외(1건 유지), 에러 없음
	require.NoError(t, svc.RecordMessageView(ctx, msgID, apg))
	assert.Equal(t, 1, count(), "작성자 본인 조회는 제외")

	// 미존재 메세지 → ErrNotFound
	err = svc.RecordMessageView(ctx, openapi_types.UUID(uuid.New()), vpg)
	assert.ErrorIs(t, err, ErrNotFound)
}

// 피드 조회 시 view_count가 FeedItem.data에 포함되어야 한다.
// (photo_url은 v3_memories 도메인 분리 후 GuestbookMessage에서 제거됨.)
func TestGuestbookService_FetchMessages_ViewCount(t *testing.T) {
	ctx := context.Background()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	authorID := uuid.New()
	viewerID := uuid.New()
	wid := uuid.New()
	lid := uuid.New()
	eid := uuid.New()
	apg := pgtype.UUID{Bytes: authorID, Valid: true}
	vpg := pgtype.UUID{Bytes: viewerID, Valid: true}
	wpg := pgtype.UUID{Bytes: wid, Valid: true}
	lpg := pgtype.UUID{Bytes: lid, Valid: true}
	epg := pgtype.UUID{Bytes: eid, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM v3_guestbook_entries WHERE id = $1`, epg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_wedding_lounges WHERE id = $1`, lpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = ANY($1)`, []pgtype.UUID{apg, vpg})
	})

	_, err := pool.Exec(ctx, `INSERT INTO v3_users (id, name, email) VALUES ($1,'작성자',$2),($3,'조회자',$4)`,
		apg, "f-author-"+authorID.String()+"@example.com", vpg, "f-viewer-"+viewerID.String()+"@example.com")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address) VALUES ($1,'신랑','신부',DATE '2026-01-01','12:00','홀','주소')`, wpg)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO v3_wedding_lounges (id, wedding_id, name) VALUES ($1,$2,'라운지')`, lpg, wpg)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO v3_guestbook_entries (id, lounge_id, guest_name, guest_id, recipient_slot, relation_category) VALUES ($1,$2,'작성자',$3,'groom','친구/지인')`, epg, lpg, apg)
	require.NoError(t, err)

	svc := NewGuestbookService(pool)
	msg, err := svc.CreateMessage(ctx, openapi_types.UUID(eid), &CreateGuestbookMessageRequest{Message: "축하 피드"})
	require.NoError(t, err)
	require.NoError(t, svc.RecordMessageView(ctx, msg.Id, vpg))

	fs := &feedService{pool: pool}
	rows, err := fs.fetchGuestbookMessages(ctx, openapi_types.UUID(lid), nil, 20)
	require.NoError(t, err)

	var found *feedRow
	for i := range rows {
		if rows[i].id.Bytes == msg.Id {
			found = &rows[i]
			break
		}
	}
	require.NotNil(t, found, "생성한 피드 글이 fetch 결과에 있어야 한다")
	assert.Equal(t, 1, found.data["view_count"], "view_count가 data에 포함(1건)")
}
