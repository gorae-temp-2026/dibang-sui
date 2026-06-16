-- name: InsertGatherPlace :one
INSERT INTO v3_moi_gather_places (lounge_id, type)
VALUES ($1, $2)
RETURNING *;
