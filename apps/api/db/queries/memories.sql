-- v3_memories: 라운지 V2 "온기" 게시물.
-- _scenario/memory-domain-split/SCENARIOS.md §1-§3.
-- 식별: author_user_id(인증 user) — GuestbookEntry 무관 → 게스트·호스트 공통.

-- name: CreateMemory :one
INSERT INTO v3_memories (lounge_id, author_user_id, text, photo_url)
VALUES ($1, $2, $3, $4)
RETURNING id, lounge_id, author_user_id, text, photo_url, created_at, deleted_at;

-- name: ListMemoriesByLounge :many
-- "온기" 그리드: 라운지의 최근 Memory들. service에서 author_user_id 그룹핑 → 최근 100명 collapse.
-- 그룹핑 N · 그룹별 정렬을 한 번에 받기 위해 raw list를 created_at DESC로 충분히 가져온다.
SELECT id, lounge_id, author_user_id, text, photo_url, created_at, deleted_at
FROM v3_memories
WHERE lounge_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2;

-- name: GetMemoryByID :one
SELECT id, lounge_id, author_user_id, text, photo_url, created_at, deleted_at
FROM v3_memories
WHERE id = $1 AND deleted_at IS NULL;

-- name: SoftDeleteMemory :execrows
-- 본인만 삭제 — author_user_id 일치 검증을 WHERE에 포함. RETURNING으로 영향 행수 확인.
-- 0행 반환 시 (id 없음·이미 삭제·다른 사용자) → service에서 ErrNotFound 또는 ErrForbidden 판단.
UPDATE v3_memories
SET deleted_at = now()
WHERE id = $1 AND author_user_id = $2 AND deleted_at IS NULL;
