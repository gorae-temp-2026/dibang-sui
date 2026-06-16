-- Legacy v2 artifacts cleanup (dev + prod 공통 잔재).
-- 분석 근거: _audit/2026-05-26-supabase-dev-drift-analysis/
--
-- 대상:
--   1. public.delete_wedding(uuid) — v2 wedding cascade 헬퍼.
--      v2 테이블 참조(photo_likes, tickets, messages, channels, guest_participations).
--      v3 코드 미참조 → 안전하게 drop.
--   2. public.wedding_host_claim_tokens 테이블 COMMENT — dev에만 dashboard로 추가된 메타 메모.
--      운영 정보성 텍스트 → NULL로 초기화.
--
-- 멱등성: IF EXISTS / COMMENT NULL 모두 안전 (객체 없으면 no-op).

BEGIN;

DROP FUNCTION IF EXISTS public.delete_wedding(uuid);

COMMENT ON TABLE public.wedding_host_claim_tokens IS NULL;

COMMIT;
