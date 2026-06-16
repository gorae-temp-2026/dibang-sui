-- name: GetUserByID :one
SELECT * FROM v3_users WHERE id = $1;

-- name: EnsureUser :exec
-- JIT 프로비저닝: 인증된 유저의 도메인 행을 멱등 보장.
-- ON CONFLICT DO NOTHING(타깃 없음) = id PK / email UNIQUE 등 모든 유니크 위반 무시 → 동시 첫 요청 안전.
INSERT INTO v3_users (id, name, email)
VALUES ($1, $2, $3)
ON CONFLICT DO NOTHING;

-- name: UpdateUser :one
UPDATE v3_users
SET name = COALESCE(sqlc.narg('name'), name),
    phone = COALESCE(sqlc.narg('phone'), phone),
    profile_image_url = COALESCE(sqlc.narg('profile_image_url'), profile_image_url)
WHERE id = $1
RETURNING *;
