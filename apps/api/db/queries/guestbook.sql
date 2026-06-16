-- name: CreateGuestbookEntry :one
-- entries.message 컬럼은 20260525130000 마이그레이션으로 드롭됨.
-- 본문은 v3_guestbook_messages에 별도 INSERT (service 레이어가 같은 트랜잭션 안에서 처리).
INSERT INTO v3_guestbook_entries (lounge_id, guest_name, guest_id, recipient_slot, relation_category, relation_detail)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ClaimGuestbookEntry :exec
UPDATE v3_guestbook_entries
SET guest_id = $2
WHERE id = $1 AND guest_id IS NULL;

-- UpdateGuestbookEntryMessage 쿼리는 20260525130000 마이그레이션 이후 폐기.
-- 메시지 편집은 별도 messages 도메인(v3_guestbook_messages)으로 이전.

-- name: GetGuestbookEntryByGuestAndLounge :one
SELECT *
FROM v3_guestbook_entries
WHERE guest_id = $1 AND lounge_id = $2
ORDER BY created_at DESC
LIMIT 1;

-- name: ListGuestbookEntries :many
SELECT *
FROM v3_guestbook_entries
WHERE lounge_id = $1
  AND (sqlc.narg('cursor')::timestamptz IS NULL OR created_at < sqlc.narg('cursor')::timestamptz)
ORDER BY created_at DESC
LIMIT $2;
