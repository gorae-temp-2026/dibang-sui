-- v3_memories: 라운지 V2의 "온기" 게시물 도메인 신설.
-- _scenario/memory-domain-split/SCENARIOS.md §0:
--   GuestbookMessage(현장 QR 축하메세지) / GuestbookEntry(게스트 신원 카드)와 분리하여,
--   author_user_id 직접 식별 + text 필수 + 사진 0/1 단위로 표현.
--   게스트·호스트 둘 다 user_id 기반으로 작성 가능 → 호스트 게시 404 자연 해소.
--
-- 함께 진행:
--   v3_guestbook_messages.photo_url 칼럼 drop (역할 분리, dev 데이터 버림).
--
-- 본 파일은 순수 PostgreSQL DDL. RLS · Realtime publication 등록은 별도 _rls 파일에서.

BEGIN;

CREATE TABLE public.v3_memories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lounge_id uuid NOT NULL REFERENCES public.v3_wedding_lounges(id) ON DELETE CASCADE,
    author_user_id uuid NOT NULL REFERENCES public.v3_users(id) ON DELETE CASCADE,
    text text NOT NULL,
    photo_url text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL,
    CONSTRAINT chk_memory_text_len CHECK (char_length(text) BETWEEN 1 AND 60)
);

-- 라운지 단위 최근순 조회용(deleted_at NULL만). "온기" 그리드의 최근 100명 collapse는
-- service에서 author_user_id 그룹핑 처리 — 인덱스는 시계열 SELECT 최적화에 집중.
CREATE INDEX idx_v3_memories_lounge_created_at
    ON public.v3_memories USING btree (lounge_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- 사람별 Memory 펼치기(스토리 뷰어)에서 사용.
CREATE INDEX idx_v3_memories_author_lounge
    ON public.v3_memories USING btree (author_user_id, lounge_id);

-- v3_guestbook_messages는 LIVE 축하메세지(현장 QR) 전용으로 환원 — 사진 책임 제거.
ALTER TABLE public.v3_guestbook_messages
    DROP COLUMN photo_url;

COMMIT;
