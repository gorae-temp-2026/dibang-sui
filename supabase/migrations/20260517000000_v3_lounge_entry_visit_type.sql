-- v3_lounge_entries.visit_type — 방문 유형 (entry=라운지 입장 / attendance=현장 참석)
--
-- db/queries/schema.sql 에는 정의돼 있으나 supabase/migrations 에 추가 마이그레이션이
-- 누락돼 있던 "유령 컬럼" 보정. sqlc V3LoungeEntry(RETURNING *)는 이 컬럼을 기대하므로,
-- 컬럼이 없는 DB(예: Supabase dev)에서는 InsertLoungeEntry 스캔이 깨져 500 발생.
--
-- 멱등: 로컬 gorae_v2 에는 이미 존재 → IF NOT EXISTS 로 안전하게 재적용 가능.
-- 순수 DDL (RLS/auth 미참조) → 로컬 psql + Supabase 양쪽 실행 가능, RLS 파일 불필요.

ALTER TABLE public.v3_lounge_entries
    ADD COLUMN IF NOT EXISTS visit_type text NOT NULL DEFAULT 'entry';

COMMENT ON COLUMN public.v3_lounge_entries.visit_type IS '방문 유형: entry (라운지 입장) | attendance (현장 참석)';
