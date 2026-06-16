-- Admin write (수정·삭제) 쿼리 모음.
-- /admin/* 경로는 AdminGuard(이메일 allowlist) 미들웨어가 보호하므로 쿼리 레벨 권한검증 없음.
-- 부분수정은 COALESCE(narg, col) — 전달된 필드만 변경, 미전달은 기존값 유지.
-- 응답 본문은 FE가 Supabase 직접 재조회로 갱신하므로 :execrows(영향 행수)만 반환 → 0행이면 service에서 ErrNotFound.
-- 핵심 필드만 수정 허용(매트릭스: _audit admin-write 설계). 위험 테이블 삭제 정책: weddings=soft, lounges·users=삭제 없음.

-- ── 감사 로그 ──
-- name: InsertAdminAuditLog :exec
INSERT INTO admin_audit_logs (
    admin_user_id, admin_email, action, resource_type, resource_id, changes, request_method, request_path
) VALUES (
    sqlc.arg('admin_user_id'),
    sqlc.arg('admin_email'),
    sqlc.arg('action'),
    sqlc.arg('resource_type'),
    sqlc.arg('resource_id'),
    convert_from(sqlc.narg('changes'), 'UTF8')::jsonb,
    sqlc.narg('request_method'),
    sqlc.narg('request_path')
);

-- ════════════════════════ UPDATE (핵심 필드만) ════════════════════════

-- name: AdminUpdateCashGift :execrows
UPDATE v3_cash_gifts
SET guest_name        = COALESCE(sqlc.narg('guest_name'), guest_name),
    amount            = COALESCE(sqlc.narg('amount'), amount),
    recipient_slot    = COALESCE(sqlc.narg('recipient_slot'), recipient_slot),
    relation_category = COALESCE(sqlc.narg('relation_category'), relation_category),
    relation_detail   = COALESCE(sqlc.narg('relation_detail'), relation_detail),
    pay_method        = COALESCE(sqlc.narg('pay_method'), pay_method)
WHERE id = sqlc.arg('id');

-- name: AdminUpdateRsvp :execrows
UPDATE v3_rsvps
SET guest_name      = COALESCE(sqlc.narg('guest_name'), guest_name),
    attendance      = COALESCE(sqlc.narg('attendance'), attendance),
    companion_count = COALESCE(sqlc.narg('companion_count'), companion_count),
    meal            = COALESCE(sqlc.narg('meal'), meal),
    recipient_slot  = COALESCE(sqlc.narg('recipient_slot'), recipient_slot),
    phone_last4     = COALESCE(sqlc.narg('phone_last4'), phone_last4)
WHERE id = sqlc.arg('id');

-- name: AdminUpdateHostInvite :execrows
UPDATE v3_host_invites
SET status = COALESCE(sqlc.narg('status'), status)
WHERE id = sqlc.arg('id');

-- name: AdminUpdateMemory :execrows
UPDATE v3_memories
SET text = COALESCE(sqlc.narg('text'), text)
WHERE id = sqlc.arg('id') AND deleted_at IS NULL;

-- name: AdminUpdateGuestbookMessage :execrows
UPDATE v3_guestbook_messages
SET message = COALESCE(sqlc.narg('message'), message)
WHERE id = sqlc.arg('id');

-- name: AdminUpdateGuestbookEntry :execrows
UPDATE v3_guestbook_entries
SET guest_name        = COALESCE(sqlc.narg('guest_name'), guest_name),
    recipient_slot    = COALESCE(sqlc.narg('recipient_slot'), recipient_slot),
    relation_category = COALESCE(sqlc.narg('relation_category'), relation_category),
    relation_detail   = COALESCE(sqlc.narg('relation_detail'), relation_detail)
WHERE id = sqlc.arg('id');

-- name: AdminUpdateMobileInvitation :execrows
UPDATE v3_mobile_invitations
SET custom_message     = COALESCE(sqlc.narg('custom_message'), custom_message),
    design_template_id = COALESCE(sqlc.narg('design_template_id'), design_template_id),
    slug               = COALESCE(sqlc.narg('slug'), slug),
    cover_image        = COALESCE(sqlc.narg('cover_image'), cover_image)
WHERE id = sqlc.arg('id');

-- name: AdminUpdateUser :execrows
UPDATE v3_users
SET name              = COALESCE(sqlc.narg('name'), name),
    phone             = COALESCE(sqlc.narg('phone'), phone),
    email             = COALESCE(sqlc.narg('email'), email),
    profile_image_url = COALESCE(sqlc.narg('profile_image_url'), profile_image_url)
WHERE id = sqlc.arg('id');

-- name: AdminUpdateLounge :execrows
UPDATE v3_wedding_lounges
SET name = COALESCE(sqlc.narg('name'), name)
WHERE id = sqlc.arg('id');

-- name: AdminUpdateWedding :execrows
UPDATE v3_weddings
SET groom_name    = COALESCE(sqlc.narg('groom_name'), groom_name),
    bride_name    = COALESCE(sqlc.narg('bride_name'), bride_name),
    date          = COALESCE(sqlc.narg('date'), date),
    "time"        = COALESCE(sqlc.narg('time'), "time"),
    venue_name    = COALESCE(sqlc.narg('venue_name'), venue_name),
    venue_address = COALESCE(sqlc.narg('venue_address'), venue_address),
    venue_hall    = COALESCE(sqlc.narg('venue_hall'), venue_hall),
    status        = COALESCE(sqlc.narg('status'), status)
WHERE id = sqlc.arg('id');

-- ════════════════════════ DELETE (hard) ════════════════════════

-- name: AdminDeleteCashGift :execrows
DELETE FROM v3_cash_gifts WHERE id = $1;

-- name: AdminDeleteRsvp :execrows
DELETE FROM v3_rsvps WHERE id = $1;

-- name: AdminDeleteHostInvite :execrows
DELETE FROM v3_host_invites WHERE id = $1;

-- name: AdminDeleteAcceptedHostInvitesBySlot :execrows
-- 호스트 슬롯 등록 해제 시, 같은 wedding+slot의 수락(accepted)된 초대를 정리(하드 삭제).
-- 슬롯 host_*_id를 NULL로 비우는 UPDATE는 컬럼이 동적이라 sqlc로 표현 못 해 서비스의 raw SQL이 담당한다.
-- pending 초대는 보존(비운 슬롯에 재수락 가능). 0행이어도 정상(생성 시 직접 채워진 슬롯엔 초대가 없을 수 있음).
DELETE FROM v3_host_invites
WHERE wedding_id = sqlc.arg('wedding_id') AND slot = sqlc.arg('slot') AND status = 'accepted';

-- name: AdminMoveAcceptedHostInvitesBySlot :execrows
-- 호스트 슬롯 이동 시, 같은 wedding+from_slot의 수락(accepted)된 초대의 slot을 to_slot으로 변경.
-- wedding 슬롯 이동(서비스의 raw SQL)과 같은 트랜잭션에서 호출돼 초대 기록과 슬롯의 일관성을 유지한다.
-- 0행이어도 정상(직접 채워진 슬롯엔 수락 초대가 없을 수 있음).
UPDATE v3_host_invites
SET slot = sqlc.arg('to_slot')
WHERE wedding_id = sqlc.arg('wedding_id') AND slot = sqlc.arg('from_slot') AND status = 'accepted';

-- name: AdminDeleteMemoryBookPhoto :execrows
DELETE FROM v3_memory_book_photos WHERE id = $1;

-- name: AdminDeleteSharedPhoto :execrows
DELETE FROM v3_shared_photos WHERE id = $1;

-- name: AdminDeleteLoungeCheckIn :execrows
DELETE FROM v3_lounge_check_ins WHERE id = $1;

-- name: AdminDeleteGuestbookMessage :execrows
DELETE FROM v3_guestbook_messages WHERE id = $1;

-- name: AdminDeleteGuestbookEntry :execrows
DELETE FROM v3_guestbook_entries WHERE id = $1;

-- name: AdminDeleteMobileInvitation :execrows
DELETE FROM v3_mobile_invitations WHERE id = $1;

-- ════════════════════════ DELETE (soft) ════════════════════════

-- name: AdminSoftDeleteMemory :execrows
UPDATE v3_memories SET deleted_at = now()
WHERE id = $1 AND deleted_at IS NULL;

-- name: AdminSoftDeleteWedding :execrows
UPDATE v3_weddings SET status = 'deleted'
WHERE id = $1 AND status <> 'deleted';
