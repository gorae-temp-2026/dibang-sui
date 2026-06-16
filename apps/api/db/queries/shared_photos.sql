-- 시나리오 §8-2, §10: 하객 현장사진 공유 (100장/하객 한도)

-- name: ListSharedPhotosByLounge :many
-- host 호출용: 라운지 전체. 하객별 그룹은 클라이언트가 guest_user_id로 group.
SELECT id, lounge_id, guest_user_id, storage_path, file_name, file_size, mime_type, created_at
FROM v3_shared_photos
WHERE lounge_id = $1
ORDER BY guest_user_id ASC, created_at DESC;

-- name: ListSharedPhotosByLoungeAndGuest :many
-- 입장자 본인 또는 host의 특정 그룹 조회.
SELECT id, lounge_id, guest_user_id, storage_path, file_name, file_size, mime_type, created_at
FROM v3_shared_photos
WHERE lounge_id = $1 AND guest_user_id = $2
ORDER BY created_at DESC;

-- name: CountSharedPhotosByLoungeAndGuest :one
-- 100장 한도 검증용. service는 advisory_xact_lock으로 race-safe 보장.
SELECT count(*)::int FROM v3_shared_photos
WHERE lounge_id = $1 AND guest_user_id = $2;

-- name: CreateSharedPhoto :one
INSERT INTO v3_shared_photos (
    lounge_id, guest_user_id, storage_path, file_name, file_size, mime_type
)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, lounge_id, guest_user_id, storage_path, file_name, file_size, mime_type, created_at;
