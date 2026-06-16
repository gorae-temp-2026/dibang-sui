-- name: ListAdminUsers :many
-- 운영자 페이지용 v3_users 목록.
-- search는 ILIKE 부분 일치 (이름/이메일/전화). 빈 문자열이면 필터 미적용.
-- own_weddings_count   = host 슬롯 6칸 중 한 곳이라도 이 유저인 wedding(status!=deleted) 수 ("본인 웨딩")
-- guest_weddings_count = 이 유저가 게스트 활동(방명록/축의금/사진/메모리/메모리북/라운지 체크인)을 한 wedding의 distinct 수 ("참여 웨딩")
SELECT
    u.id,
    u.name,
    u.email,
    u.phone,
    u.profile_image_url,
    u.created_at,
    COUNT(*) OVER () AS total_count,
    (
        SELECT COUNT(*) FROM v3_weddings w
        WHERE w.status <> 'deleted'
          AND u.id IN (
              w.host_groom_id, w.host_bride_id,
              w.host_groom_father_id, w.host_groom_mother_id,
              w.host_bride_father_id, w.host_bride_mother_id
          )
    ) AS own_weddings_count,
    (
        SELECT COUNT(DISTINCT g.wedding_id) FROM (
            SELECT l.wedding_id FROM v3_guestbook_entries gbe
                JOIN v3_wedding_lounges l ON l.id = gbe.lounge_id
                WHERE gbe.guest_id = u.id
            UNION
            SELECT cg.wedding_id FROM v3_cash_gifts cg WHERE cg.guest_id = u.id
            UNION
            SELECT l.wedding_id FROM v3_shared_photos sp
                JOIN v3_wedding_lounges l ON l.id = sp.lounge_id
                WHERE sp.guest_user_id = u.id
            UNION
            SELECT l.wedding_id FROM v3_memories mm
                JOIN v3_wedding_lounges l ON l.id = mm.lounge_id
                WHERE mm.author_user_id = u.id
            UNION
            SELECT mbp.wedding_id FROM v3_memory_book_photos mbp WHERE mbp.selected_by = u.id
            UNION
            SELECT l.wedding_id FROM v3_lounge_check_ins le
                JOIN v3_wedding_lounges l ON l.id = le.lounge_id
                WHERE le.user_id = u.id
        ) g
    ) AS guest_weddings_count
FROM v3_users u
WHERE (
    sqlc.arg('search')::text = ''
    OR u.name ILIKE '%' || sqlc.arg('search')::text || '%'
    OR u.email ILIKE '%' || sqlc.arg('search')::text || '%'
    OR COALESCE(u.phone, '') ILIKE '%' || sqlc.arg('search')::text || '%'
)
ORDER BY u.created_at DESC
LIMIT sqlc.arg('lim')::int
OFFSET sqlc.arg('off')::int;

-- name: GetAdminUser :one
SELECT
    u.id, u.name, u.email, u.phone, u.profile_image_url, u.created_at,
    (
        SELECT COUNT(*) FROM v3_weddings w
        WHERE w.status <> 'deleted'
          AND u.id IN (
              w.host_groom_id, w.host_bride_id,
              w.host_groom_father_id, w.host_groom_mother_id,
              w.host_bride_father_id, w.host_bride_mother_id
          )
    ) AS own_weddings_count,
    (
        SELECT COUNT(DISTINCT g.wedding_id) FROM (
            SELECT l.wedding_id FROM v3_guestbook_entries gbe
                JOIN v3_wedding_lounges l ON l.id = gbe.lounge_id
                WHERE gbe.guest_id = u.id
            UNION
            SELECT cg.wedding_id FROM v3_cash_gifts cg WHERE cg.guest_id = u.id
            UNION
            SELECT l.wedding_id FROM v3_shared_photos sp
                JOIN v3_wedding_lounges l ON l.id = sp.lounge_id
                WHERE sp.guest_user_id = u.id
            UNION
            SELECT l.wedding_id FROM v3_memories mm
                JOIN v3_wedding_lounges l ON l.id = mm.lounge_id
                WHERE mm.author_user_id = u.id
            UNION
            SELECT mbp.wedding_id FROM v3_memory_book_photos mbp WHERE mbp.selected_by = u.id
            UNION
            SELECT l.wedding_id FROM v3_lounge_check_ins le
                JOIN v3_wedding_lounges l ON l.id = le.lounge_id
                WHERE le.user_id = u.id
        ) g
    ) AS guest_weddings_count
FROM v3_users u
WHERE u.id = $1;

-- name: ListAdminUserHostParticipations :many
-- 호스트 슬롯 6칸 중 어떤 슬롯인지 라벨링하여 반환. UNION ALL 6개 (sqlc v1.30 호환).
SELECT
    w.id AS wedding_id, w.groom_name, w.bride_name,
    w.date AS wedding_date, w.status AS wedding_status,
    w.created_at,
    'groom'::text AS slot_kind
FROM v3_weddings w
WHERE w.host_groom_id = $1 AND w.status <> 'deleted'
UNION ALL
SELECT w.id, w.groom_name, w.bride_name, w.date, w.status, w.created_at, 'bride'::text
FROM v3_weddings w
WHERE w.host_bride_id = $1 AND w.status <> 'deleted'
UNION ALL
SELECT w.id, w.groom_name, w.bride_name, w.date, w.status, w.created_at, 'groom_father'::text
FROM v3_weddings w
WHERE w.host_groom_father_id = $1 AND w.status <> 'deleted'
UNION ALL
SELECT w.id, w.groom_name, w.bride_name, w.date, w.status, w.created_at, 'groom_mother'::text
FROM v3_weddings w
WHERE w.host_groom_mother_id = $1 AND w.status <> 'deleted'
UNION ALL
SELECT w.id, w.groom_name, w.bride_name, w.date, w.status, w.created_at, 'bride_father'::text
FROM v3_weddings w
WHERE w.host_bride_father_id = $1 AND w.status <> 'deleted'
UNION ALL
SELECT w.id, w.groom_name, w.bride_name, w.date, w.status, w.created_at, 'bride_mother'::text
FROM v3_weddings w
WHERE w.host_bride_mother_id = $1 AND w.status <> 'deleted'
ORDER BY created_at DESC;

-- name: GetAdminUserActivityCounts :one
-- 단일 row에 7개 활동 카운트. sqlc v1.30 회피: 모든 subquery에 명시 alias + 조건은 단일 컬럼.
SELECT
    (SELECT COUNT(*) FROM v3_guestbook_entries gbe WHERE gbe.guest_id = sqlc.arg('uid')) AS guestbook,
    (SELECT COUNT(*) FROM v3_cash_gifts cg WHERE cg.guest_id = sqlc.arg('uid')) AS cash_gifts,
    (SELECT COUNT(*) FROM v3_guestbook_entries gbe2
        WHERE gbe2.guest_id = sqlc.arg('uid')
          AND EXISTS (SELECT 1 FROM v3_guestbook_messages gm2 WHERE gm2.guestbook_entry_id = gbe2.id)
    ) AS messages,
    (SELECT COUNT(*) FROM v3_shared_photos sp WHERE sp.guest_user_id = sqlc.arg('uid')) AS shared_photos,
    (SELECT COUNT(*) FROM v3_memories mm WHERE mm.author_user_id = sqlc.arg('uid')) AS memories,
    (SELECT COUNT(*) FROM v3_memory_book_photos mbp WHERE mbp.selected_by = sqlc.arg('uid')) AS memory_book,
    (SELECT COUNT(*) FROM v3_lounge_check_ins le WHERE le.user_id = sqlc.arg('uid')) AS lounge;

-- name: ListAdminGuestbookActivities :many
SELECT
    e.id,
    e.created_at,
    -- summary: {관계 카테고리} · {세부}. entries.message 컬럼은 20260525130000 마이그레이션으로 드롭됨 — 메시지 본문은 ListAdminMessageActivities가 별도 보고.
    (
        e.relation_category
        || CASE WHEN e.relation_detail IS NOT NULL AND e.relation_detail <> '' THEN ' · ' || e.relation_detail ELSE '' END
    )::text AS summary,
    w.id AS wedding_id,
    w.groom_name,
    w.bride_name,
    COUNT(*) OVER () AS total_count
FROM v3_guestbook_entries e
JOIN v3_wedding_lounges l ON l.id = e.lounge_id
JOIN v3_weddings w ON w.id = l.wedding_id
WHERE e.guest_id = $1
ORDER BY e.created_at DESC
LIMIT sqlc.arg('lim')::int OFFSET sqlc.arg('off')::int;

-- name: ListAdminCashGiftActivities :many
SELECT
    g.id,
    g.created_at,
    g.amount,
    -- summary: {관계 카테고리} · {세부}. NULL 안전.
    (
        g.relation_category
        || CASE WHEN g.relation_detail IS NOT NULL AND g.relation_detail <> '' THEN ' · ' || g.relation_detail ELSE '' END
    )::text AS relation_summary,
    w.id AS wedding_id,
    w.groom_name,
    w.bride_name,
    COUNT(*) OVER () AS total_count
FROM v3_cash_gifts g
JOIN v3_weddings w ON w.id = g.wedding_id
WHERE g.guest_id = $1
ORDER BY g.created_at DESC
LIMIT sqlc.arg('lim')::int OFFSET sqlc.arg('off')::int;

-- name: ListAdminMessageActivities :many
SELECT
    gm.id,
    gm.created_at,
    gm.message AS summary,
    w.id AS wedding_id,
    w.groom_name,
    w.bride_name,
    COUNT(*) OVER () AS total_count
FROM v3_guestbook_messages gm
JOIN v3_guestbook_entries ge ON ge.id = gm.guestbook_entry_id
JOIN v3_wedding_lounges l ON l.id = ge.lounge_id
JOIN v3_weddings w ON w.id = l.wedding_id
WHERE ge.guest_id = $1
ORDER BY gm.created_at DESC
LIMIT sqlc.arg('lim')::int OFFSET sqlc.arg('off')::int;

-- name: ListAdminSharedPhotoActivities :many
SELECT
    sp.id,
    sp.created_at,
    COALESCE(sp.file_name, '')::text AS summary,
    w.id AS wedding_id,
    w.groom_name,
    w.bride_name,
    COUNT(*) OVER () AS total_count
FROM v3_shared_photos sp
JOIN v3_wedding_lounges l ON l.id = sp.lounge_id
JOIN v3_weddings w ON w.id = l.wedding_id
WHERE sp.guest_user_id = $1
ORDER BY sp.created_at DESC
LIMIT sqlc.arg('lim')::int OFFSET sqlc.arg('off')::int;

-- name: ListAdminMemoryActivities :many
SELECT
    mm.id,
    mm.created_at,
    mm.text AS summary,
    w.id AS wedding_id,
    w.groom_name,
    w.bride_name,
    COUNT(*) OVER () AS total_count
FROM v3_memories mm
JOIN v3_wedding_lounges l ON l.id = mm.lounge_id
JOIN v3_weddings w ON w.id = l.wedding_id
WHERE mm.author_user_id = $1
ORDER BY mm.created_at DESC
LIMIT sqlc.arg('lim')::int OFFSET sqlc.arg('off')::int;

-- name: ListAdminMemoryBookActivities :many
SELECT
    mbp.id,
    mbp.created_at,
    NULL::text AS summary,
    w.id AS wedding_id,
    w.groom_name,
    w.bride_name,
    COUNT(*) OVER () AS total_count
FROM v3_memory_book_photos mbp
JOIN v3_weddings w ON w.id = mbp.wedding_id
WHERE mbp.selected_by = $1
ORDER BY mbp.created_at DESC
LIMIT sqlc.arg('lim')::int OFFSET sqlc.arg('off')::int;

-- name: ListAdminLoungeActivities :many
SELECT
    le.id,
    le.created_at,
    -- summary: {관계 카테고리} · {세부}. 둘 다 nullable.
    (
        COALESCE(le.relation_category, '')
        || CASE
            WHEN le.relation_detail IS NOT NULL AND le.relation_detail <> ''
            THEN CASE WHEN le.relation_category IS NOT NULL AND le.relation_category <> '' THEN ' · ' ELSE '' END || le.relation_detail
            ELSE ''
        END
    )::text AS summary,
    w.id AS wedding_id,
    w.groom_name,
    w.bride_name,
    COUNT(*) OVER () AS total_count
FROM v3_lounge_check_ins le
JOIN v3_wedding_lounges l ON l.id = le.lounge_id
JOIN v3_weddings w ON w.id = l.wedding_id
WHERE le.user_id = $1
ORDER BY le.created_at DESC
LIMIT sqlc.arg('lim')::int OFFSET sqlc.arg('off')::int;
