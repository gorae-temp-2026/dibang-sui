-- v3_lounge_entries → v3_lounge_check_ins 전면 rename
-- 배경: UI 용어("체크인")와 DB/코드 용어("entry") 통일
-- 참고: _audit/2026-05-26-lounge-check-in-rename/DECISIONS.md

-- 1. 테이블 rename
ALTER TABLE IF EXISTS public.v3_lounge_entries RENAME TO v3_lounge_check_ins;

-- 2. PK rename (옛 v3_moi_visits_pkey 잔재 정리 — 2026-05-11 rename에서 누락)
ALTER INDEX IF EXISTS public.v3_moi_visits_pkey RENAME TO v3_lounge_check_ins_pkey;

-- 3. 인덱스 rename
ALTER INDEX IF EXISTS public.idx_v3_lounge_entries_lounge_user RENAME TO idx_v3_lounge_check_ins_lounge_user;

-- 4. UNIQUE 제약 rename
ALTER TABLE public.v3_lounge_check_ins
    RENAME CONSTRAINT v3_lounge_entries_user_lounge_key TO v3_lounge_check_ins_user_lounge_key;

-- 5. FK 제약 rename
ALTER TABLE public.v3_lounge_check_ins
    RENAME CONSTRAINT v3_lounge_entries_lounge_id_fkey TO v3_lounge_check_ins_lounge_id_fkey;

ALTER TABLE public.v3_lounge_check_ins
    RENAME CONSTRAINT v3_lounge_entries_user_id_fkey TO v3_lounge_check_ins_user_id_fkey;
