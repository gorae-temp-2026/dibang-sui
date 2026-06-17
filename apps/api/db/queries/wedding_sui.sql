-- Sui 온체인 오브젝트 ID dual-write (C7 데이터 브릿지).
-- 호스트 웨딩 온체인 생성 후 발행 ID를 Supabase row에 저장. 온체인 실패 시 호출 안 함(null 유지).

-- name: UpdateWeddingSuiIds :exec
UPDATE v3_weddings
SET sui_wedding_id = $2,
    sui_vault_id   = $3
WHERE id = $1;

-- name: UpdateLoungeSuiId :exec
UPDATE v3_wedding_lounges
SET sui_lounge_id = $2
WHERE wedding_id = $1;
