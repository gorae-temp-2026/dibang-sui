-- 피드 글에 사진 1장(선택) + 조회 기록/조회수.
--
-- FEED 확장 노선(2026-05-19, 사용자 결정): 신규 v3_feeds 테이블을 만들지 않고
-- 기존 v3_guestbook_messages(라운지 글 = 피드)를 확장한다. 메모리
-- project_lounge_v2_decisions #2("사진·이미지·조회수 MVP 제외, 백엔드 0")의 반전.
--
-- - photo_url: 글에 첨부하는 사진 0~1장(/uploads R5 업로드 URL). nullable.
-- - v3_guestbook_message_views: 조회 기록. 본인(작성자) 제외는 앱/서비스 레벨,
--   동일 (message, viewer) 중복은 UNIQUE로 멱등(서비스가 ON CONFLICT DO NOTHING).
--
-- v3 마이그레이션은 RLS 정책을 사용하지 않으므로(백엔드 service_role 접근,
-- 기존 v3 마이그레이션 _rls 파일 0건) 본 파일도 DDL only.

ALTER TABLE public.v3_guestbook_messages
    ADD COLUMN photo_url text;

CREATE TABLE public.v3_guestbook_message_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guestbook_message_id uuid NOT NULL,
    viewer_id uuid NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT v3_guestbook_message_views_pkey PRIMARY KEY (id),
    CONSTRAINT v3_guestbook_message_views_message_fkey FOREIGN KEY (guestbook_message_id)
        REFERENCES public.v3_guestbook_messages(id) ON DELETE CASCADE,
    CONSTRAINT v3_guestbook_message_views_viewer_fkey FOREIGN KEY (viewer_id)
        REFERENCES public.v3_users(id) ON DELETE CASCADE,
    CONSTRAINT v3_guestbook_message_views_unique UNIQUE (guestbook_message_id, viewer_id)
);

CREATE INDEX idx_v3_guestbook_message_views_message
    ON public.v3_guestbook_message_views USING btree (guestbook_message_id);
