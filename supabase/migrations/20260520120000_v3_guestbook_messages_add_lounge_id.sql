-- v3_guestbook_messages에 lounge_id 비정규화 컬럼 추가.
-- mecdisplay → guest-web 이식 워크스트림(_scenario/display-port/SCENARIOS.md §0).
--
-- 도입 이유: 라운지 단위 Supabase Realtime 구독(`filter:lounge_id=eq.X`)이 정상 동작하려면
-- 메시지 행에 lounge_id가 있어야 한다. 기존 v3_guestbook_messages는 entry를 통해서만
-- lounge_id를 얻을 수 있어 Realtime postgres_changes 필터에 직접 쓸 수 없다.
--
-- 채움 전략(SCENARIOS §2): 백엔드 service_guestbook_messages가 INSERT 시 entry에서
-- lounge_id를 조회해 명시적으로 구성. 본 마이그레이션에서는 (1) ADD COLUMN nullable
-- (2) 기존 row 백필 (3) SET NOT NULL + FK + 인덱스를 한 트랜잭션에 묶어 원자성 보장.
--
-- 본 파일은 순수 PostgreSQL DDL. RLS·Realtime publication 등록은 별도 _rls 파일에서.

BEGIN;

ALTER TABLE public.v3_guestbook_messages
    ADD COLUMN lounge_id uuid;

UPDATE public.v3_guestbook_messages gm
SET lounge_id = ge.lounge_id
FROM public.v3_guestbook_entries ge
WHERE ge.id = gm.guestbook_entry_id
  AND gm.lounge_id IS NULL;

ALTER TABLE public.v3_guestbook_messages
    ALTER COLUMN lounge_id SET NOT NULL,
    ADD CONSTRAINT v3_guestbook_messages_lounge_fkey
        FOREIGN KEY (lounge_id) REFERENCES public.v3_wedding_lounges(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_v3_guestbook_messages_lounge_created_at
    ON public.v3_guestbook_messages USING btree (lounge_id, created_at);

COMMIT;
