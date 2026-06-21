-- name: InsertWedding :one
INSERT INTO v3_weddings (
    groom_name, bride_name,
    groom_father_name, groom_mother_name,
    bride_father_name, bride_mother_name,
    groom_father_deceased, groom_mother_deceased,
    bride_father_deceased, bride_mother_deceased,
    date, "time",
    venue_name, venue_address, venue_hall,
    groom_account, bride_account,
    groom_father_account, groom_mother_account,
    bride_father_account, bride_mother_account,
    host_groom_id, host_bride_id,
    host_groom_father_id, host_groom_mother_id,
    host_bride_father_id, host_bride_mother_id
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
    $12, $13, $14, $15,
    convert_from($16, 'UTF8')::jsonb, convert_from($17, 'UTF8')::jsonb,
    convert_from($18, 'UTF8')::jsonb, convert_from($19, 'UTF8')::jsonb,
    convert_from($20, 'UTF8')::jsonb, convert_from($21, 'UTF8')::jsonb,
    $22, $23, $24, $25, $26, $27
) RETURNING *;

-- name: GetWedding :one
SELECT * FROM v3_weddings WHERE id = $1;

-- name: GetWeddingFull :one
SELECT w.*,
       l.id AS lounge_id, l.name AS lounge_name, l.sui_lounge_id AS sui_lounge_id,
       gp.id AS gather_place_id,
       COALESCE((SELECT COUNT(*) FROM v3_lounge_check_ins ci
                 WHERE ci.lounge_id = l.id
                   AND ci.recipient_slot IN ('groom', 'groom_father', 'groom_mother')), 0)::bigint AS groom_side_guest_count,
       COALESCE((SELECT COUNT(*) FROM v3_lounge_check_ins ci
                 WHERE ci.lounge_id = l.id
                   AND ci.recipient_slot IN ('bride', 'bride_father', 'bride_mother')), 0)::bigint AS bride_side_guest_count
FROM v3_weddings w
LEFT JOIN v3_wedding_lounges l ON l.wedding_id = w.id
LEFT JOIN v3_moi_gather_places gp ON gp.lounge_id = l.id
WHERE w.id = $1;

-- name: UpdateWeddingInfo :one
UPDATE v3_weddings
SET groom_name = COALESCE(sqlc.narg('groom_name'), groom_name),
    bride_name = COALESCE(sqlc.narg('bride_name'), bride_name),
    groom_father_name = COALESCE(sqlc.narg('groom_father_name'), groom_father_name),
    groom_mother_name = COALESCE(sqlc.narg('groom_mother_name'), groom_mother_name),
    bride_father_name = COALESCE(sqlc.narg('bride_father_name'), bride_father_name),
    bride_mother_name = COALESCE(sqlc.narg('bride_mother_name'), bride_mother_name),
    groom_father_deceased = COALESCE(sqlc.narg('groom_father_deceased'), groom_father_deceased),
    groom_mother_deceased = COALESCE(sqlc.narg('groom_mother_deceased'), groom_mother_deceased),
    bride_father_deceased = COALESCE(sqlc.narg('bride_father_deceased'), bride_father_deceased),
    bride_mother_deceased = COALESCE(sqlc.narg('bride_mother_deceased'), bride_mother_deceased),
    date = COALESCE(sqlc.narg('date'), date),
    "time" = COALESCE(sqlc.narg('time'), "time"),
    venue_name = COALESCE(sqlc.narg('venue_name'), venue_name),
    venue_address = COALESCE(sqlc.narg('venue_address'), venue_address),
    venue_hall = COALESCE(sqlc.narg('venue_hall'), venue_hall),
    groom_account = COALESCE(convert_from(sqlc.narg('groom_account'), 'UTF8')::jsonb, groom_account),
    bride_account = COALESCE(convert_from(sqlc.narg('bride_account'), 'UTF8')::jsonb, bride_account),
    groom_father_account = COALESCE(convert_from(sqlc.narg('groom_father_account'), 'UTF8')::jsonb, groom_father_account),
    groom_mother_account = COALESCE(convert_from(sqlc.narg('groom_mother_account'), 'UTF8')::jsonb, groom_mother_account),
    bride_father_account = COALESCE(convert_from(sqlc.narg('bride_father_account'), 'UTF8')::jsonb, bride_father_account),
    bride_mother_account = COALESCE(convert_from(sqlc.narg('bride_mother_account'), 'UTF8')::jsonb, bride_mother_account),
    host_groom_id = COALESCE(sqlc.narg('host_groom_id'), host_groom_id),
    host_bride_id = COALESCE(sqlc.narg('host_bride_id'), host_bride_id),
    host_groom_father_id = COALESCE(sqlc.narg('host_groom_father_id'), host_groom_father_id),
    host_groom_mother_id = COALESCE(sqlc.narg('host_groom_mother_id'), host_groom_mother_id),
    host_bride_father_id = COALESCE(sqlc.narg('host_bride_father_id'), host_bride_father_id),
    host_bride_mother_id = COALESCE(sqlc.narg('host_bride_mother_id'), host_bride_mother_id),
    version = version + 1
WHERE id = $1 AND (sqlc.arg('expected_version') < 0 OR version = sqlc.arg('expected_version'))
RETURNING *;

-- name: GetMyWeddings :many
SELECT w.id, w.status, w.groom_name, w.bride_name,
       w.groom_father_name, w.groom_mother_name, w.bride_father_name, w.bride_mother_name,
       w.date, w."time",
       w.venue_name, w.venue_hall,
       w.host_groom_id, w.host_bride_id,
       w.host_groom_father_id, w.host_groom_mother_id,
       w.host_bride_father_id, w.host_bride_mother_id,
       l.id AS lounge_id
FROM v3_weddings w
LEFT JOIN v3_wedding_lounges l ON l.wedding_id = w.id
WHERE (w.host_groom_id = $1
       OR w.host_bride_id = $1
       OR w.host_groom_father_id = $1
       OR w.host_groom_mother_id = $1
       OR w.host_bride_father_id = $1
       OR w.host_bride_mother_id = $1)
  AND w.status != 'deleted'
ORDER BY w.created_at DESC;

-- name: GetParticipatedWeddings :many
SELECT DISTINCT w.id, w.groom_name, w.bride_name, w.date, w."time",
       w.venue_name, w.venue_hall,
       (SELECT cover_image FROM v3_mobile_invitations WHERE wedding_id = w.id LIMIT 1) AS cover_image,
       l.id AS lounge_id
FROM v3_weddings w
JOIN v3_wedding_lounges l ON l.wedding_id = w.id
WHERE w.id IN (
    -- LoungeCheckIn을 통한 참여
    SELECT wl.wedding_id
    FROM v3_lounge_check_ins le
    JOIN v3_wedding_lounges wl ON wl.id = le.lounge_id
    WHERE le.user_id = $1
    UNION
    -- GuestbookEntry를 통한 참여
    SELECT wl2.wedding_id
    FROM v3_guestbook_entries ge
    JOIN v3_wedding_lounges wl2 ON wl2.id = ge.lounge_id
    WHERE ge.guest_id = $1
)
ORDER BY w.date DESC;
