-- RSVP — 모바일 청첩장 참석 의사 (QA 2026-05-29 G1).
-- 게스트가 청첩장에서 제출(InsertRsvp), 호스트가 리포트에서 측별로 조회(ListRsvpsByWeddingSlots).
-- 측별 공유 권한(신랑측 3명 공유 / 신랑·신부측 비공유)은 핸들러가 호스트 측 슬롯을 slots로 넘겨 강제.

-- name: InsertRsvp :one
INSERT INTO v3_rsvps (wedding_id, recipient_slot, guest_name, attendance, companion_count, meal, phone_last4)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, wedding_id, recipient_slot, guest_name, attendance, companion_count, meal, phone_last4, created_at;

-- name: ListRsvpsByWeddingSlots :many
SELECT id, wedding_id, recipient_slot, guest_name, attendance, companion_count, meal, phone_last4, created_at
FROM v3_rsvps
WHERE wedding_id = $1
  AND recipient_slot = ANY(@slots::text[])
ORDER BY created_at DESC;
