-- 시나리오 §8-1, §10: 청첩장 사진 (cover 1 + gallery 60장)

-- name: ListMobileInvitationPhotosByInvitation :many
SELECT id, invitation_id, sub_kind, storage_path, file_name, file_size, mime_type, sort_order, created_at
FROM v3_mobile_invitation_photos
WHERE invitation_id = $1
ORDER BY sub_kind ASC, sort_order ASC, created_at ASC;

-- name: CreateMobileInvitationPhoto :one
-- cover는 invitation당 1행(uniq_v3_mi_photos_cover partial UNIQUE).
-- 위반 시 PostgreSQL이 23505 unique_violation 반환 → service에서 ErrCoverConflict로 매핑.
INSERT INTO v3_mobile_invitation_photos (
    invitation_id, sub_kind, storage_path, file_name, file_size, mime_type, sort_order
)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, invitation_id, sub_kind, storage_path, file_name, file_size, mime_type, sort_order, created_at;

-- name: GetInvitationWeddingID :one
-- 권한 검증용: invitation_id → wedding_id 매핑(권한은 wedding owner 기준).
SELECT wedding_id FROM v3_mobile_invitations WHERE id = $1;
