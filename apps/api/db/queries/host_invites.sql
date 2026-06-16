-- name: InsertHostInvite :one
INSERT INTO v3_host_invites (wedding_id, slot, token)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetHostInviteByToken :one
SELECT hi.*, w.groom_name, w.bride_name, w.date, w.venue_name
FROM v3_host_invites hi
JOIN v3_weddings w ON w.id = hi.wedding_id
WHERE hi.token = $1;

-- name: GetHostInviteByID :one
SELECT * FROM v3_host_invites WHERE id = $1;

-- name: GetPendingInviteBySlot :one
SELECT * FROM v3_host_invites
WHERE wedding_id = $1 AND slot = $2 AND status = 'pending'
LIMIT 1;

-- name: AcceptHostInvite :one
UPDATE v3_host_invites
SET status = 'accepted',
    invited_user_id = $2,
    accepted_at = now()
WHERE token = $1 AND status = 'pending'
RETURNING *;

-- name: CancelHostInvite :exec
UPDATE v3_host_invites
SET status = 'cancelled'
WHERE id = $1 AND status = 'pending';

-- name: ListHostInvitesByWeddingID :many
SELECT * FROM v3_host_invites
WHERE wedding_id = $1
ORDER BY created_at;
