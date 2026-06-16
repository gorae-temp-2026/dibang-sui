-- dev에 잔존한 v3_guestbook_messages.photo_url 청산.
-- 분석 근거: _audit/2026-05-26-supabase-dev-drift-analysis/
--
-- 배경:
--   원 의도(`20260522120000_v3_memories.sql`)는 memory-domain-split의 일부로
--   ALTER TABLE v3_guestbook_messages DROP COLUMN photo_url 을 수행했다.
--   prod/local엔 실제 적용됐으나 dev엔 마킹만 되고 SQL 실행이 누락 → drift.
--
--   dev DB 확인 결과 47 row 중 photo_url 값 있는 row 0 — 데이터 손실 위험 없음.
--
-- 멱등성: IF EXISTS — prod/local은 이미 없어 no-op, dev에서만 실제 drop.

BEGIN;

ALTER TABLE public.v3_guestbook_messages
    DROP COLUMN IF EXISTS photo_url;

COMMIT;
