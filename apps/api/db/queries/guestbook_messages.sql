-- name: CreateGuestbookMessage :one
-- LIVE 축하메세지(현장 QR) 전용으로 책임 환원. 사진은 v3_memories 도메인이 담당.
-- lounge_id는 부모 GuestbookEntry에서 조회해 service가 명시 전달(mecdisplay Realtime
-- 구독 `filter:lounge_id=eq.X`의 전제).
INSERT INTO v3_guestbook_messages (guestbook_entry_id, message, lounge_id)
VALUES ($1, $2, $3)
RETURNING id, guestbook_entry_id, message, lounge_id, created_at;

-- name: GetGuestbookEntryLoungeID :one
-- mecdisplay 워크스트림: 메세지 INSERT 시 부모 entry의 lounge_id를 비정규화 컬럼에
-- 채우기 위한 단순 조회. entry 미존재 시 pgx.ErrNoRows.
SELECT lounge_id FROM v3_guestbook_entries WHERE id = $1;

-- name: GetGuestbookMessageEntryGuest :one
-- 본인(작성자) 판정용: 메세지 → 소속 GuestbookEntry → guest_id.
-- 행이 없으면 메세지 미존재(404). guest_id는 비로그인 작성 시 NULL.
SELECT ge.guest_id
FROM v3_guestbook_messages gm
JOIN v3_guestbook_entries ge ON ge.id = gm.guestbook_entry_id
WHERE gm.id = $1;

-- name: RecordGuestbookMessageView :exec
-- 조회 기록. 동일 (message, viewer) 중복은 UNIQUE로 멱등(첫 1회만 적재).
INSERT INTO v3_guestbook_message_views (guestbook_message_id, viewer_id)
VALUES ($1, $2)
ON CONFLICT (guestbook_message_id, viewer_id) DO NOTHING;
