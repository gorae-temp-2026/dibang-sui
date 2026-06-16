-- name: InsertLounge :one
INSERT INTO v3_wedding_lounges (wedding_id, name)
VALUES ($1, $2)
RETURNING *;

-- name: GetWeddingIDByLoungeID :one
SELECT wedding_id FROM v3_wedding_lounges WHERE id = $1;

-- name: GetLoungeByID :one
SELECT l.id, l.wedding_id, l.name, gp.id as gather_place_id, gp.type as gather_place_type
FROM v3_wedding_lounges l
JOIN v3_moi_gather_places gp ON gp.lounge_id = l.id
WHERE l.id = $1;
