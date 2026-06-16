-- v3_guestbook_entries, v3_guestbook_messages: authenticated SELECT 정책 추가.
--
-- 배경: 20260520120100_v3_guestbook_messages_add_lounge_id_rls.sql 이
--       RLS ENABLE + anon SELECT 정책만 부여 (mecdisplay 공개 디스플레이용).
--       그 후 신설된 admin 앱(apps/admin)이 authenticated 세션으로 접근하는데
--       매치되는 SELECT 정책이 없어 0행 반환 → "방명록 0 / 라운지 메시지 0" 표시.
--       2026-05-25 prod 운영자 화면에서 발견됨.
--
-- 작용: anon read·realtime publication 의도는 그대로 유지하고
--       authenticated read 정책만 추가. 기존 정책·publication 무수정.
--
-- 순수 RLS 변경. DDL 없음 (Supabase 전용, 로컬 psql 비호환 가능).

CREATE POLICY v3_guestbook_entries_auth_select
    ON public.v3_guestbook_entries FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY v3_guestbook_messages_auth_select
    ON public.v3_guestbook_messages FOR SELECT
    TO authenticated
    USING (true);
