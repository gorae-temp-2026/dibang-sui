-- v3 워크스트림에서 첫 RLS 정책 도입(SCENARIOS §0 "guest-web anon supabase-js 직접
-- SELECT/Realtime" 결정에 따른). 기존 v3 백엔드는 service_role 접근이라 RLS 영향 없음
-- (Supabase service_role은 BYPASSRLS).
--
-- 작용: (1) v3_guestbook_entries, v3_guestbook_messages에 RLS ENABLE
--       (2) anon SELECT 허용 (mecdisplay 공개 디스플레이용)
--       (3) Realtime publication(supabase_realtime)에 두 테이블 등록
--
-- 의도적 이탈(명시 표면화): anon SELECT는 guest_name·message 평문 노출. v3
-- API_CONVENTIONS의 이름 마스킹은 백엔드 핸들러 책임이라 anon 직접 SELECT에서는
-- 적용 불가. 레거시 mecdisplay와 동등성을 우선해 그대로 둔다. INSERT/UPDATE/DELETE는
-- 정책 미정의 → service_role만 가능(RLS ENABLE 후 기본 deny).
--
-- 본 파일은 Supabase 전용(anon role + supabase_realtime publication). 로컬 psql에는
-- 적용하지 않는다(메모리: feedback_migration_ddl_rls_split).

ALTER TABLE public.v3_guestbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v3_guestbook_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY v3_guestbook_entries_anon_select
    ON public.v3_guestbook_entries FOR SELECT
    TO anon
    USING (true);

CREATE POLICY v3_guestbook_messages_anon_select
    ON public.v3_guestbook_messages FOR SELECT
    TO anon
    USING (true);

-- Realtime publication 등록(이미 등록되어 있으면 에러 → 안전을 위해 DO 블록)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'v3_guestbook_entries'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.v3_guestbook_entries';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'v3_guestbook_messages'
    ) THEN
        EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.v3_guestbook_messages';
    END IF;
END $$;
