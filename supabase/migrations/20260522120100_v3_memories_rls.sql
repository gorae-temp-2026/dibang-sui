-- v3_memories RLS + Realtime publication.
-- _scenario/memory-domain-split/SCENARIOS.md §B(S-06): 라운지 V2 본체는 인증 필수.
--   anon SELECT 정책 부여 안 함(GuestbookMessage와 달리 MEC디스플레이 공개 대상 아님).
--   service_role은 RLS bypass라 백엔드 INSERT/UPDATE/DELETE에 영향 없음.
--   authenticated SELECT만 허용 → supabase-js 클라이언트로 라운지 V2 안에서만 조회.
--
-- 본 파일은 Supabase 전용. 로컬 psql에는 적용하지 않는다(메모리: feedback_migration_ddl_rls_split).

ALTER TABLE public.v3_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY v3_memories_authenticated_select
    ON public.v3_memories FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

-- Realtime publication 등록(이미 있으면 skip — DO 블록으로 안전 처리).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'v3_memories'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.v3_memories';
    END IF;
END $$;
