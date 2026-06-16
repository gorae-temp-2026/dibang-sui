package api

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	openapi_types "github.com/oapi-codegen/runtime/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// adminCtx: 감사 로그에 필요한 admin userID/email을 컨텍스트에 주입.
func adminCtx() context.Context {
	ctx := WithUserContext(context.Background(), pgtype.UUID{Bytes: uuid.New(), Valid: true})
	return WithEmailContext(ctx, "admin@gorae.dev")
}

func newAdminSvc(pool *pgxpool.Pool) AdminMutationService {
	return NewAdminMutationService(pool, NewAuditLogger(pool))
}

// 픽스처: wedding + cash_gift 1건. 정리 함수 반환.
func seedCashGift(t *testing.T, ctx context.Context, pool *pgxpool.Pool) (weddingID, giftID uuid.UUID) {
	t.Helper()
	weddingID = uuid.New()
	giftID = uuid.New()
	wpg := pgtype.UUID{Bytes: weddingID, Valid: true}
	gpg := pgtype.UUID{Bytes: giftID, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM admin_audit_logs WHERE resource_id = $1`, giftID.String())
		_, _ = pool.Exec(ctx, `DELETE FROM v3_cash_gifts WHERE wedding_id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
	})
	_, err := pool.Exec(ctx, `
		INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address)
		VALUES ($1, '신랑', '신부', DATE '2026-01-01', '12:00', '홀', '주소')`, wpg)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_cash_gifts (id, wedding_id, guest_name, recipient_slot, relation_category, amount, pay_method)
		VALUES ($1, $2, '김친구', 'groom', '직장동료', 50000, 'transfer')`, gpg, wpg)
	require.NoError(t, err)
	return weddingID, giftID
}

func TestAdminService_UpdateCashGift_ChangesAndAudits(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	_, giftID := seedCashGift(t, ctx, pool)

	svc := newAdminSvc(pool)
	newAmount := 99000
	newName := "수정된이름"
	err := svc.UpdateCashGift(ctx, openapi_types.UUID(giftID), &UpdateAdminCashGiftRequest{
		Amount:    &newAmount,
		GuestName: &newName,
	})
	require.NoError(t, err)

	var (
		amount int
		name   string
	)
	require.NoError(t, pool.QueryRow(ctx, `SELECT amount, guest_name FROM v3_cash_gifts WHERE id = $1`,
		pgtype.UUID{Bytes: giftID, Valid: true}).Scan(&amount, &name))
	assert.Equal(t, 99000, amount, "amount 수정 반영")
	assert.Equal(t, "수정된이름", name, "guest_name 수정 반영")

	// 미전달 필드는 유지
	var slot string
	require.NoError(t, pool.QueryRow(ctx, `SELECT recipient_slot FROM v3_cash_gifts WHERE id = $1`,
		pgtype.UUID{Bytes: giftID, Valid: true}).Scan(&slot))
	assert.Equal(t, "groom", slot, "미전달 recipient_slot 유지")

	// 감사 로그 1건
	var auditCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM admin_audit_logs WHERE resource_id = $1 AND action = 'update'`,
		giftID.String()).Scan(&auditCount))
	assert.Equal(t, 1, auditCount, "수정 1건이 감사 로그에 기록")
}

func TestAdminService_DeleteCashGift_RemovesAndAudits(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	_, giftID := seedCashGift(t, ctx, pool)

	svc := newAdminSvc(pool)
	require.NoError(t, svc.DeleteCashGift(ctx, openapi_types.UUID(giftID)))

	var exists bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM v3_cash_gifts WHERE id = $1)`,
		pgtype.UUID{Bytes: giftID, Valid: true}).Scan(&exists))
	assert.False(t, exists, "삭제됨")

	var auditCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM admin_audit_logs WHERE resource_id = $1 AND action = 'delete'`,
		giftID.String()).Scan(&auditCount))
	assert.Equal(t, 1, auditCount, "삭제 1건이 감사 로그에 기록")
}

func TestAdminService_DeleteCashGift_NotFound(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	svc := newAdminSvc(pool)
	err := svc.DeleteCashGift(ctx, openapi_types.UUID(uuid.New()))
	assert.ErrorIs(t, err, ErrNotFound, "없는 id 삭제는 ErrNotFound")
}

func TestAdminService_SoftDeleteWedding_SetsStatusDeleted(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _ := seedCashGift(t, ctx, pool)
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM admin_audit_logs WHERE resource_id = $1`, weddingID.String())
	})

	svc := newAdminSvc(pool)
	require.NoError(t, svc.DeleteWedding(ctx, openapi_types.UUID(weddingID)))

	var (
		status string
		exists bool
	)
	require.NoError(t, pool.QueryRow(ctx, `SELECT status, true FROM v3_weddings WHERE id = $1`,
		pgtype.UUID{Bytes: weddingID, Valid: true}).Scan(&status, &exists))
	assert.True(t, exists, "행은 물리 삭제되지 않음(soft)")
	assert.Equal(t, "deleted", status, "status='deleted'")

	// 이미 삭제된 것을 또 삭제 → 변경 0행 → ErrNotFound
	err := svc.DeleteWedding(ctx, openapi_types.UUID(weddingID))
	assert.ErrorIs(t, err, ErrNotFound, "이미 deleted면 ErrNotFound")
}

func TestAdminService_UpdateUser_EmailConflict(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })

	uA, uB := uuid.New(), uuid.New()
	emailA := "a-" + uuid.New().String() + "@ex.com"
	emailB := "b-" + uuid.New().String() + "@ex.com"
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM admin_audit_logs WHERE resource_id = $1`, uB.String())
		_, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = ANY($1)`, []string{uA.String(), uB.String()})
	})
	_, err := pool.Exec(ctx, `INSERT INTO v3_users (id, name, email) VALUES ($1,'A',$2),($3,'B',$4)`,
		pgtype.UUID{Bytes: uA, Valid: true}, emailA, pgtype.UUID{Bytes: uB, Valid: true}, emailB)
	require.NoError(t, err)

	svc := newAdminSvc(pool)
	// B의 email을 A의 email로 → unique 충돌
	err = svc.UpdateUser(ctx, openapi_types.UUID(uB), &UpdateAdminUserRequest{
		Email: (*openapi_types.Email)(&emailA),
	})
	assert.ErrorIs(t, err, ErrConflict, "email 중복은 ErrConflict")
}

// ──────────── ClearWeddingHostSlot ────────────

// seedWeddingHostSlot: groom 슬롯이 userID로 채워진 wedding 1건 +
// 같은 슬롯(groom) accepted 초대 1건 + 다른 슬롯(bride) pending 초대 1건(보존 확인용).
func seedWeddingHostSlot(t *testing.T, ctx context.Context, pool *pgxpool.Pool) (weddingID, userID, acceptedInviteID, pendingInviteID uuid.UUID) {
	t.Helper()
	weddingID, userID = uuid.New(), uuid.New()
	acceptedInviteID, pendingInviteID = uuid.New(), uuid.New()
	wpg := pgtype.UUID{Bytes: weddingID, Valid: true}
	upg := pgtype.UUID{Bytes: userID, Valid: true}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, `DELETE FROM admin_audit_logs WHERE resource_id = $1`, weddingID.String())
		_, _ = pool.Exec(ctx, `DELETE FROM v3_host_invites WHERE wedding_id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_weddings WHERE id = $1`, wpg)
		_, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = $1`, upg)
	})
	_, err := pool.Exec(ctx, `INSERT INTO v3_users (id, name, email) VALUES ($1, '호스트', $2)`,
		upg, "host-"+userID.String()+"@ex.com")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_weddings (id, groom_name, bride_name, date, "time", venue_name, venue_address, host_groom_id)
		VALUES ($1, '신랑', '신부', DATE '2026-01-01', '12:00', '홀', '주소', $2)`, wpg, upg)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_host_invites (id, wedding_id, slot, token, status, invited_user_id, accepted_at)
		VALUES ($1, $2, 'groom', $3, 'accepted', $4, now())`,
		pgtype.UUID{Bytes: acceptedInviteID, Valid: true}, wpg, "tok-acc-"+acceptedInviteID.String(), upg)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_host_invites (id, wedding_id, slot, token, status)
		VALUES ($1, $2, 'bride', $3, 'pending')`,
		pgtype.UUID{Bytes: pendingInviteID, Valid: true}, wpg, "tok-pend-"+pendingInviteID.String())
	require.NoError(t, err)
	return
}

func TestAdminService_ClearWeddingHostSlot_ClearsSlotAndDeletesAcceptedInvite(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _, acceptedInviteID, pendingInviteID := seedWeddingHostSlot(t, ctx, pool)

	svc := newAdminSvc(pool)
	require.NoError(t, svc.ClearWeddingHostSlot(ctx, openapi_types.UUID(weddingID), "groom"))

	wpg := pgtype.UUID{Bytes: weddingID, Valid: true}
	// 슬롯이 NULL로 비워짐
	var hostGroom pgtype.UUID
	require.NoError(t, pool.QueryRow(ctx, `SELECT host_groom_id FROM v3_weddings WHERE id = $1`, wpg).Scan(&hostGroom))
	assert.False(t, hostGroom.Valid, "host_groom_id가 NULL로 비워짐")

	// 같은 슬롯 accepted 초대 삭제됨
	var acceptedExists bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM v3_host_invites WHERE id = $1)`,
		pgtype.UUID{Bytes: acceptedInviteID, Valid: true}).Scan(&acceptedExists))
	assert.False(t, acceptedExists, "같은 슬롯 accepted 초대 삭제됨")

	// 다른 슬롯 pending 초대는 보존
	var pendingExists bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM v3_host_invites WHERE id = $1)`,
		pgtype.UUID{Bytes: pendingInviteID, Valid: true}).Scan(&pendingExists))
	assert.True(t, pendingExists, "다른 슬롯 pending 초대는 보존")

	// 감사 로그 1건
	var auditCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM admin_audit_logs WHERE resource_id = $1 AND action = 'clear_host_slot'`,
		weddingID.String()).Scan(&auditCount))
	assert.Equal(t, 1, auditCount, "clear_host_slot 감사 1건 기록")
}

func TestAdminService_ClearWeddingHostSlot_InvalidSlot(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _, _, _ := seedWeddingHostSlot(t, ctx, pool)

	svc := newAdminSvc(pool)
	err := svc.ClearWeddingHostSlot(ctx, openapi_types.UUID(weddingID), "invalid_slot")
	assert.ErrorIs(t, err, ErrValidation, "허용되지 않은 슬롯은 ErrValidation")
}

func TestAdminService_ClearWeddingHostSlot_EmptySlotNotFound(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _, _, _ := seedWeddingHostSlot(t, ctx, pool)

	svc := newAdminSvc(pool)
	// bride 슬롯은 비어 있음(host_bride_id NULL) → 비울 게 없음 → ErrNotFound
	err := svc.ClearWeddingHostSlot(ctx, openapi_types.UUID(weddingID), "bride")
	assert.ErrorIs(t, err, ErrNotFound, "이미 빈 슬롯은 ErrNotFound")
}

// 슬롯을 비우면 같은 슬롯에 다시 초대→수락이 가능해야 한다(ErrSlotAlreadyTaken 해소).
func TestAdminService_ClearWeddingHostSlot_AllowsReinvite(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _, _, _ := seedWeddingHostSlot(t, ctx, pool)

	// groom 슬롯 비우기
	svc := newAdminSvc(pool)
	require.NoError(t, svc.ClearWeddingHostSlot(ctx, openapi_types.UUID(weddingID), "groom"))

	// 같은 슬롯(groom)에 새 초대를 발급하고 다른 사용자가 수락 → 성공해야 함
	newUserID := uuid.New()
	newUserPg := pgtype.UUID{Bytes: newUserID, Valid: true}
	t.Cleanup(func() { _, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = $1`, newUserPg) })
	_, err := pool.Exec(ctx, `INSERT INTO v3_users (id, name, email) VALUES ($1, '새호스트', $2)`,
		newUserPg, "reinvite-"+newUserID.String()+"@ex.com")
	require.NoError(t, err)

	token := "tok-reinvite-" + uuid.New().String()
	_, err = pool.Exec(ctx, `
		INSERT INTO v3_host_invites (wedding_id, slot, token, status)
		VALUES ($1, 'groom', $2, 'pending')`, pgtype.UUID{Bytes: weddingID, Valid: true}, token)
	require.NoError(t, err)

	hostSvc := NewHostInviteService(pool)
	_, err = hostSvc.Accept(ctx, token, newUserPg)
	require.NoError(t, err, "슬롯이 비었으므로 재수락 성공(ErrSlotAlreadyTaken 아님)")

	// 재수락으로 슬롯이 새 사용자로 다시 채워짐
	var hostGroom pgtype.UUID
	require.NoError(t, pool.QueryRow(ctx, `SELECT host_groom_id FROM v3_weddings WHERE id = $1`,
		pgtype.UUID{Bytes: weddingID, Valid: true}).Scan(&hostGroom))
	assert.True(t, hostGroom.Valid, "재수락으로 슬롯이 다시 채워짐")
	assert.Equal(t, newUserID[:], hostGroom.Bytes[:], "새 사용자로 채워짐")
}

// ──────────── MoveWeddingHostSlot (슬롯 이동) ────────────

func TestAdminService_MoveWeddingHostSlot_MovesSlotAndAcceptedInvite(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, userID, acceptedInviteID, pendingInviteID := seedWeddingHostSlot(t, ctx, pool)
	wpg := pgtype.UUID{Bytes: weddingID, Valid: true}

	svc := newAdminSvc(pool)
	// groom(채워짐) → groom_father(빈 슬롯) 이동
	require.NoError(t, svc.MoveWeddingHostSlot(ctx, openapi_types.UUID(weddingID), "groom", "groom_father"))

	// 출발 슬롯은 NULL, 대상 슬롯이 원래 사용자로 채워짐
	var hostGroom, hostGroomFather pgtype.UUID
	require.NoError(t, pool.QueryRow(ctx, `SELECT host_groom_id, host_groom_father_id FROM v3_weddings WHERE id = $1`, wpg).
		Scan(&hostGroom, &hostGroomFather))
	assert.False(t, hostGroom.Valid, "출발(groom) 슬롯은 NULL로 비워짐")
	assert.True(t, hostGroomFather.Valid, "대상(groom_father) 슬롯이 채워짐")
	assert.Equal(t, userID[:], hostGroomFather.Bytes[:], "원래 호스트가 대상 슬롯으로 이동")

	// 같은 슬롯의 accepted 초대도 slot이 groom_father로 변경
	var movedSlot string
	require.NoError(t, pool.QueryRow(ctx, `SELECT slot FROM v3_host_invites WHERE id = $1`,
		pgtype.UUID{Bytes: acceptedInviteID, Valid: true}).Scan(&movedSlot))
	assert.Equal(t, "groom_father", movedSlot, "accepted 초대 slot이 함께 이동")

	// 다른 슬롯(bride) pending 초대는 변화 없음
	var pendingSlot string
	require.NoError(t, pool.QueryRow(ctx, `SELECT slot FROM v3_host_invites WHERE id = $1`,
		pgtype.UUID{Bytes: pendingInviteID, Valid: true}).Scan(&pendingSlot))
	assert.Equal(t, "bride", pendingSlot, "다른 슬롯 초대는 변화 없음")

	// 감사 로그 1건
	var auditCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM admin_audit_logs WHERE resource_id = $1 AND action = 'move_host_slot'`,
		weddingID.String()).Scan(&auditCount))
	assert.Equal(t, 1, auditCount, "move_host_slot 감사 1건 기록")
}

func TestAdminService_MoveWeddingHostSlot_TargetOccupiedConflict(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, userID, _, _ := seedWeddingHostSlot(t, ctx, pool)
	wpg := pgtype.UUID{Bytes: weddingID, Valid: true}

	// bride 슬롯을 다른 사용자로 채워 충돌 상황 구성
	otherID := uuid.New()
	otherPg := pgtype.UUID{Bytes: otherID, Valid: true}
	t.Cleanup(func() { _, _ = pool.Exec(ctx, `DELETE FROM v3_users WHERE id = $1`, otherPg) })
	_, err := pool.Exec(ctx, `INSERT INTO v3_users (id, name, email) VALUES ($1, '신부', $2)`,
		otherPg, "bride-"+otherID.String()+"@ex.com")
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `UPDATE v3_weddings SET host_bride_id = $1 WHERE id = $2`, otherPg, wpg)
	require.NoError(t, err)

	svc := newAdminSvc(pool)
	err = svc.MoveWeddingHostSlot(ctx, openapi_types.UUID(weddingID), "groom", "bride")
	assert.ErrorIs(t, err, ErrConflict, "대상 슬롯이 차 있으면 ErrConflict")

	// 롤백: groom/bride 슬롯 모두 원래대로
	var hostGroom, hostBride pgtype.UUID
	require.NoError(t, pool.QueryRow(ctx, `SELECT host_groom_id, host_bride_id FROM v3_weddings WHERE id = $1`, wpg).
		Scan(&hostGroom, &hostBride))
	assert.Equal(t, userID[:], hostGroom.Bytes[:], "groom 슬롯 변화 없음")
	assert.Equal(t, otherID[:], hostBride.Bytes[:], "bride 슬롯 변화 없음")
}

func TestAdminService_MoveWeddingHostSlot_EmptySourceNotFound(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _, _, _ := seedWeddingHostSlot(t, ctx, pool)

	svc := newAdminSvc(pool)
	// bride 슬롯은 비어 있음 → 옮길 호스트 없음 → ErrNotFound
	err := svc.MoveWeddingHostSlot(ctx, openapi_types.UUID(weddingID), "bride", "groom_father")
	assert.ErrorIs(t, err, ErrNotFound, "출발 슬롯이 비었으면 ErrNotFound")
}

func TestAdminService_MoveWeddingHostSlot_InvalidSlot(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _, _, _ := seedWeddingHostSlot(t, ctx, pool)

	svc := newAdminSvc(pool)
	assert.ErrorIs(t, svc.MoveWeddingHostSlot(ctx, openapi_types.UUID(weddingID), "invalid", "groom_father"),
		ErrValidation, "잘못된 출발 슬롯은 ErrValidation")
	assert.ErrorIs(t, svc.MoveWeddingHostSlot(ctx, openapi_types.UUID(weddingID), "groom", "invalid"),
		ErrValidation, "잘못된 대상 슬롯은 ErrValidation")
}

func TestAdminService_MoveWeddingHostSlot_SameSlot(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _, _, _ := seedWeddingHostSlot(t, ctx, pool)

	svc := newAdminSvc(pool)
	err := svc.MoveWeddingHostSlot(ctx, openapi_types.UUID(weddingID), "groom", "groom")
	assert.ErrorIs(t, err, ErrValidation, "같은 슬롯으로의 이동은 ErrValidation")
}

// ──────────── CreateHostInvite (admin 발급) ────────────

func TestAdminService_CreateHostInvite_IssuesTokenAndAudits(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _, _, _ := seedWeddingHostSlot(t, ctx, pool)

	svc := newAdminSvc(pool)
	// bride_father 슬롯은 비어 있음(seed는 groom만 채움) → 거기에 초대 발급
	inv, err := svc.CreateHostInvite(ctx, openapi_types.UUID(weddingID), "bride_father")
	require.NoError(t, err)
	require.NotNil(t, inv)
	t.Cleanup(func() { _, _ = pool.Exec(ctx, `DELETE FROM admin_audit_logs WHERE resource_id = $1`, inv.Id.String()) })

	assert.NotEmpty(t, inv.Token, "token 발급됨")
	assert.Equal(t, "pending", string(inv.Status), "status=pending")
	assert.Equal(t, "bride_father", string(inv.Slot))

	// DB에 pending 행 1건
	var cnt int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM v3_host_invites WHERE wedding_id=$1 AND slot='bride_father' AND status='pending'`,
		pgtype.UUID{Bytes: weddingID, Valid: true}).Scan(&cnt))
	assert.Equal(t, 1, cnt, "pending 초대 1건 생성")

	// 감사 로그 1건
	var auditCnt int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM admin_audit_logs WHERE resource_id=$1 AND action='create_host_invite'`,
		inv.Id.String()).Scan(&auditCnt))
	assert.Equal(t, 1, auditCnt, "create_host_invite 감사 1건")
}

func TestAdminService_CreateHostInvite_ReusesPending(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _, _, _ := seedWeddingHostSlot(t, ctx, pool)

	svc := newAdminSvc(pool)
	inv1, err := svc.CreateHostInvite(ctx, openapi_types.UUID(weddingID), "bride_father")
	require.NoError(t, err)
	require.NotEmpty(t, inv1.Token)
	t.Cleanup(func() { _, _ = pool.Exec(ctx, `DELETE FROM admin_audit_logs WHERE resource_id = $1`, inv1.Id.String()) })

	inv2, err := svc.CreateHostInvite(ctx, openapi_types.UUID(weddingID), "bride_father")
	require.NoError(t, err)
	assert.Equal(t, inv1.Token, inv2.Token, "같은 슬롯 pending 재사용 — 동일 token")
}

func TestAdminService_CreateHostInvite_InvalidSlot(t *testing.T) {
	ctx := adminCtx()
	pool := testPool(t)
	t.Cleanup(func() { pool.Close() })
	weddingID, _, _, _ := seedWeddingHostSlot(t, ctx, pool)

	svc := newAdminSvc(pool)
	_, err := svc.CreateHostInvite(ctx, openapi_types.UUID(weddingID), "bogus")
	assert.ErrorIs(t, err, ErrValidation, "허용되지 않은 슬롯은 ErrValidation")
}
