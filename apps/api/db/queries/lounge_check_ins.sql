-- name: ListLoungeCheckIns :many
SELECT lc.id, lc.user_id, lc.lounge_id,
       lc.visitor_name,
       lc.created_at,
       CASE
           WHEN lc.user_id = w.host_groom_id THEN 'groom'
           WHEN lc.user_id = w.host_bride_id THEN 'bride'
           WHEN lc.user_id = w.host_groom_father_id THEN 'groom_father'
           WHEN lc.user_id = w.host_groom_mother_id THEN 'groom_mother'
           WHEN lc.user_id = w.host_bride_father_id THEN 'bride_father'
           WHEN lc.user_id = w.host_bride_mother_id THEN 'bride_mother'
           ELSE NULL
       END AS host_role,
       -- recipient_slot/relation_category/relation_detail는 LoungeCheckIn에서 nullable(도메인).
       -- LEFT JOIN LATERAL ge도 매칭 없으면 NULL이라 결과도 nullable. sqlc v1.30이 LATERAL의
       -- nullability를 추론하지 못해 NOT NULL string으로 생성 → NULL 스캔 시 panic.
       -- sqlc.yaml의 column override(`v3_lounge_check_ins.recipient_slot` 등을 pgtype.Text)로 강제.
       COALESCE(lc.recipient_slot, ge.recipient_slot) AS recipient_slot,
       COALESCE(lc.relation_category, ge.relation_category) AS relation_category,
       COALESCE(lc.relation_detail, ge.relation_detail) AS relation_detail
FROM v3_lounge_check_ins lc
JOIN v3_moi_gather_places gp ON gp.lounge_id = lc.lounge_id
JOIN v3_wedding_lounges wl ON wl.id = lc.lounge_id
JOIN v3_weddings w ON w.id = wl.wedding_id
LEFT JOIN LATERAL (
    SELECT recipient_slot, relation_category, relation_detail
    FROM v3_guestbook_entries
    WHERE guest_id = lc.user_id AND lounge_id = lc.lounge_id
    ORDER BY created_at DESC
    LIMIT 1
) ge ON true
WHERE gp.id = $1
  AND (sqlc.narg('cursor')::timestamptz IS NULL OR lc.created_at < sqlc.narg('cursor')::timestamptz)
ORDER BY lc.created_at DESC
LIMIT $2;

-- name: InsertLoungeCheckIn :one
-- 멱등 체크인: UNIQUE(user_id, lounge_id) 충돌 시 0행 반환(ErrNoRows) → 호출부가
-- 기존 행을 재조회한다(race-safe get-or-create, AUD-7).
INSERT INTO v3_lounge_check_ins (user_id, lounge_id, visitor_name, recipient_slot, relation_category, relation_detail)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (user_id, lounge_id) DO NOTHING
RETURNING id, user_id, lounge_id, visitor_name, created_at, recipient_slot, relation_category, relation_detail;

-- name: GetLoungeCheckInByUserAndLounge :one
SELECT id, user_id, lounge_id, visitor_name, created_at, recipient_slot, relation_category, relation_detail
FROM v3_lounge_check_ins
WHERE user_id = $1 AND lounge_id = $2
LIMIT 1;

-- name: GetMoiByUserID :one
SELECT id FROM v3_mois WHERE user_id = $1;

-- name: EnsureMoi :exec
-- JIT 프로비저닝: 유저의 Moi 행을 멱등 보장(v3_mois_user_id_key UNIQUE 기반).
-- id=gen_random_uuid 기본, equipped_items='{}' 기본 → user_id만 필요. v3_users 선행 필수(FK).
INSERT INTO v3_mois (user_id)
VALUES ($1)
ON CONFLICT (user_id) DO NOTHING;

-- name: GetGatherPlaceByLoungeID :one
SELECT id FROM v3_moi_gather_places WHERE lounge_id = $1;
