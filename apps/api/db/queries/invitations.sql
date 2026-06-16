-- name: InsertInvitation :one
INSERT INTO v3_mobile_invitations (wedding_id, slug, design_template_id)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetInvitationBySlug :one
SELECT i.*, w.groom_name, w.bride_name, w.date, w."time",
       w.venue_name, w.venue_address, w.venue_hall,
       w.groom_father_name, w.groom_mother_name,
       w.bride_father_name, w.bride_mother_name,
       w.groom_father_deceased, w.groom_mother_deceased,
       w.bride_father_deceased, w.bride_mother_deceased,
       w.groom_account, w.bride_account,
       w.groom_father_account, w.groom_mother_account,
       w.bride_father_account, w.bride_mother_account
FROM v3_mobile_invitations i
JOIN v3_weddings w ON w.id = i.wedding_id
WHERE i.slug = $1;

-- name: GetInvitationByID :one
SELECT * FROM v3_mobile_invitations WHERE id = $1;

-- name: UpdateInvitation :one
UPDATE v3_mobile_invitations
SET design_template_id = COALESCE(sqlc.narg('design_template_id'), design_template_id),
    custom_message = COALESCE(sqlc.narg('custom_message'), custom_message),
    gallery_photos = COALESCE(convert_from(sqlc.narg('gallery_photos'), 'UTF8')::jsonb, gallery_photos),
    cover_image = COALESCE(sqlc.narg('cover_image'), cover_image),
    cover_text_config = COALESCE(convert_from(sqlc.narg('cover_text_config'), 'UTF8')::jsonb, cover_text_config),
    design_config = COALESCE(convert_from(sqlc.narg('design_config'), 'UTF8')::jsonb, design_config)
WHERE id = $1
RETURNING *;

-- name: DeleteInvitation :exec
DELETE FROM v3_mobile_invitations WHERE id = $1;

-- name: IncrementHeartCount :one
UPDATE v3_mobile_invitations
SET heart_count = heart_count + 1
WHERE slug = $1
RETURNING heart_count;

-- name: ListInvitationsByWeddingID :many
SELECT id, slug, cover_image FROM v3_mobile_invitations WHERE wedding_id = $1 ORDER BY created_at;

-- name: CountInvitationsByWeddingID :one
SELECT COUNT(*) FROM v3_mobile_invitations WHERE wedding_id = $1;
