-- name: InsertAnnouncement :one
INSERT INTO v3_host_announcements (lounge_id, host_id, message, is_pinned)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ListAnnouncements :many
SELECT *
FROM v3_host_announcements
WHERE lounge_id = $1
  AND deleted_at IS NULL
  AND (sqlc.narg('cursor')::timestamptz IS NULL OR created_at < sqlc.narg('cursor')::timestamptz)
ORDER BY created_at DESC
LIMIT $2;

-- name: GetAnnouncementByID :one
SELECT * FROM v3_host_announcements
WHERE id = $1 AND deleted_at IS NULL;

-- name: UpdateAnnouncement :one
UPDATE v3_host_announcements
SET message = COALESCE(sqlc.narg('message'), message),
    is_pinned = COALESCE(sqlc.narg('is_pinned'), is_pinned),
    updated_at = now()
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteAnnouncement :exec
UPDATE v3_host_announcements
SET deleted_at = now()
WHERE id = $1 AND deleted_at IS NULL;

-- name: UnpinAllAnnouncements :exec
UPDATE v3_host_announcements
SET is_pinned = false
WHERE lounge_id = $1 AND is_pinned = true AND deleted_at IS NULL;

-- name: SoftDeleteAllAnnouncements :exec
UPDATE v3_host_announcements
SET deleted_at = now()
WHERE lounge_id = $1 AND deleted_at IS NULL;
