-- name: GetAdminDashboardStats :one
-- KST 자정 기준 오늘 통계 + 전체. NOW() AT TIME ZONE 'Asia/Seoul' → 한국 시각 → date 변환.
SELECT
    (SELECT COUNT(*) FROM v3_weddings
        WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date = ((now() AT TIME ZONE 'Asia/Seoul')::date)
          AND status <> 'deleted') AS today_weddings,
    (SELECT COUNT(*) FROM v3_users
        WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date = ((now() AT TIME ZONE 'Asia/Seoul')::date)) AS today_users,
    (SELECT COUNT(*) FROM v3_cash_gifts
        WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date = ((now() AT TIME ZONE 'Asia/Seoul')::date)) AS today_cash_gifts_count,
    (SELECT COALESCE(SUM(amount), 0) FROM v3_cash_gifts
        WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date = ((now() AT TIME ZONE 'Asia/Seoul')::date))::bigint AS today_cash_gifts_amount,
    (SELECT COUNT(*) FROM v3_users) AS total_users,
    (SELECT COUNT(*) FROM v3_weddings WHERE status <> 'deleted') AS total_weddings;

-- name: ListAdminRecentUsers :many
SELECT u.id, u.name, u.email, u.phone, u.profile_image_url, u.created_at,
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
ORDER BY u.created_at DESC
LIMIT 5;

-- name: ListAdminRecentWeddings :many
SELECT id, groom_name, bride_name, date, status, created_at
FROM v3_weddings
WHERE status <> 'deleted'
ORDER BY created_at DESC
LIMIT 5;

-- name: GetAdminDashboardHealth :one
-- 5개 헬스체크 메트릭.
SELECT
    (SELECT COUNT(*) FROM v3_weddings w
        WHERE w.status <> 'deleted'
          AND sqlc.arg('placeholder_uid')::uuid IN (
              w.host_groom_id, w.host_bride_id,
              w.host_groom_father_id, w.host_groom_mother_id,
              w.host_bride_father_id, w.host_bride_mother_id
          )) AS placeholder_host_weddings,
    (SELECT COUNT(*) FROM v3_users
        WHERE name = '사용자' OR split_part(email, '@', 1) = name) AS name_fallback_users,
    (SELECT COUNT(*) FROM v3_weddings WHERE status = 'deleted') AS deleted_weddings,
    (SELECT COUNT(*) FROM (
        SELECT 1 FROM v3_weddings
        GROUP BY groom_name, bride_name
        HAVING COUNT(*) > 1
    ) dup) AS duplicate_couples,
    (
        SELECT ROUND(
            AVG(
                CASE WHEN host_groom_id IS NULL THEN 1 ELSE 0 END +
                CASE WHEN host_bride_id IS NULL THEN 1 ELSE 0 END +
                CASE WHEN host_groom_father_id IS NULL THEN 1 ELSE 0 END +
                CASE WHEN host_groom_mother_id IS NULL THEN 1 ELSE 0 END +
                CASE WHEN host_bride_father_id IS NULL THEN 1 ELSE 0 END +
                CASE WHEN host_bride_mother_id IS NULL THEN 1 ELSE 0 END
            ) / 6.0, 4
        )
        FROM v3_weddings WHERE status <> 'deleted'
    )::float AS null_host_slot_ratio;
