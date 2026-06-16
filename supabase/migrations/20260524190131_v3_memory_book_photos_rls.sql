-- v3_memory_book_photos RLS.
-- _scenario/wedding-memorybook-2026-05-24/SCENARIOS.md §E(S-17, S-18):
--   호스트 권한 = v3_weddings의 6슬롯(groom/bride/groom_father/groom_mother/bride_father/bride_mother)
--   중 하나라도 auth.uid()와 일치. 호스트만 ALL.
--   service_role은 RLS bypass라 백엔드 핸들러 동작에는 영향 없음 — 본 정책은
--   Supabase 클라이언트 직접 접근(있다면)을 차단하기 위함.
--
-- 본 파일은 Supabase 전용. 로컬 psql에는 적용하지 않는다(메모리: feedback_migration_ddl_rls_split).

ALTER TABLE public.v3_memory_book_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY v3_memory_book_photos_host_all
    ON public.v3_memory_book_photos FOR ALL
    TO authenticated
    USING (
        wedding_id IN (
            SELECT id FROM public.v3_weddings
            WHERE auth.uid() IN (
                host_groom_id,
                host_bride_id,
                host_groom_father_id,
                host_groom_mother_id,
                host_bride_father_id,
                host_bride_mother_id
            )
        )
    )
    WITH CHECK (
        wedding_id IN (
            SELECT id FROM public.v3_weddings
            WHERE auth.uid() IN (
                host_groom_id,
                host_bride_id,
                host_groom_father_id,
                host_groom_mother_id,
                host_bride_father_id,
                host_bride_mother_id
            )
        )
    );
