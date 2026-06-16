-- attended 도출 규약: cash_gift.guestbook_entry_id가 해당 결혼식 라운지의
-- GuestbookEntry를 직접 가리키면 현장참석(true). 호스트 수기 입력 등 미연결
-- (guestbook_entry_id NULL)은 false. is_attended 캐시 컬럼 폐지(R2),
-- guest_id claim 기준 폐지(P1: 비로그인 게스트 플로우 링크 기반으로 전환).

-- name: InsertCashGift :one
INSERT INTO v3_cash_gifts (wedding_id, guest_name, guest_id, recipient_slot, relation_category, relation_detail, amount, pay_method, guestbook_entry_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING v3_cash_gifts.id, v3_cash_gifts.wedding_id, v3_cash_gifts.guest_name, v3_cash_gifts.guest_id, v3_cash_gifts.recipient_slot, v3_cash_gifts.relation_category, v3_cash_gifts.relation_detail, v3_cash_gifts.amount, v3_cash_gifts.pay_method, v3_cash_gifts.guestbook_entry_id, v3_cash_gifts.created_at,
    EXISTS (
        SELECT 1 FROM v3_guestbook_entries ge
        JOIN v3_wedding_lounges wl ON wl.id = ge.lounge_id
        WHERE wl.wedding_id = v3_cash_gifts.wedding_id AND ge.id = v3_cash_gifts.guestbook_entry_id
    ) AS attended;

-- name: ListCashGiftsByWedding :many
SELECT cg.id, cg.wedding_id, cg.guest_name, cg.guest_id, cg.recipient_slot, cg.relation_category, cg.relation_detail, cg.amount, cg.pay_method, cg.guestbook_entry_id, cg.created_at,
    EXISTS (
        SELECT 1 FROM v3_guestbook_entries ge
        JOIN v3_wedding_lounges wl ON wl.id = ge.lounge_id
        WHERE wl.wedding_id = cg.wedding_id AND ge.id = cg.guestbook_entry_id
    ) AS attended
FROM v3_cash_gifts cg
WHERE cg.wedding_id = $1
  AND (sqlc.narg('cursor')::timestamptz IS NULL OR cg.created_at < sqlc.narg('cursor')::timestamptz)
ORDER BY cg.created_at DESC
LIMIT $2;

-- name: GetCashGift :one
SELECT cg.id, cg.wedding_id, cg.guest_name, cg.guest_id, cg.recipient_slot, cg.relation_category, cg.relation_detail, cg.amount, cg.pay_method, cg.guestbook_entry_id, cg.created_at,
    EXISTS (
        SELECT 1 FROM v3_guestbook_entries ge
        JOIN v3_wedding_lounges wl ON wl.id = ge.lounge_id
        WHERE wl.wedding_id = cg.wedding_id AND ge.id = cg.guestbook_entry_id
    ) AS attended
FROM v3_cash_gifts cg
WHERE cg.id = $1;

-- name: UpdateCashGift :one
UPDATE v3_cash_gifts
SET guest_name = $2,
    amount = $3,
    relation_category = $4,
    relation_detail = $5,
    pay_method = $6
WHERE v3_cash_gifts.id = $1
RETURNING v3_cash_gifts.id, v3_cash_gifts.wedding_id, v3_cash_gifts.guest_name, v3_cash_gifts.guest_id, v3_cash_gifts.recipient_slot, v3_cash_gifts.relation_category, v3_cash_gifts.relation_detail, v3_cash_gifts.amount, v3_cash_gifts.pay_method, v3_cash_gifts.guestbook_entry_id, v3_cash_gifts.created_at,
    EXISTS (
        SELECT 1 FROM v3_guestbook_entries ge
        JOIN v3_wedding_lounges wl ON wl.id = ge.lounge_id
        WHERE wl.wedding_id = v3_cash_gifts.wedding_id AND ge.id = v3_cash_gifts.guestbook_entry_id
    ) AS attended;

-- name: DeleteCashGift :exec
DELETE FROM v3_cash_gifts
WHERE id = $1;

-- name: GetCashGiftsSummary :one
SELECT
    COALESCE(SUM(cg.amount), 0)::bigint AS total_amount,
    COUNT(*)::bigint AS total_count,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM v3_guestbook_entries ge
        JOIN v3_wedding_lounges wl ON wl.id = ge.lounge_id
        WHERE wl.wedding_id = cg.wedding_id AND ge.id = cg.guestbook_entry_id
    ))::bigint AS attended_count
FROM v3_cash_gifts cg
WHERE cg.wedding_id = $1;
