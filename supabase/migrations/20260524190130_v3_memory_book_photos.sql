-- v3_memory_book_photos: 호스트가 큐레이션한 웨딩메모리북 사진(최대 30장).
-- _scenario/wedding-memorybook-2026-05-24/SCENARIOS.md §A(S-01~S-05), §F(S-20):
--   v2 web-mobile-application/apps/api/src/routes/host/memorybook.ts 의 메모리북 큐레이션
--   기능을 v3로 이식. 큐레이션 소스는 v3_shared_photos (라운지 게스트 공유 사진).
--   display_order는 호스트가 선택한 순서(1..30).
--
-- 함께 정의:
--   RPC v3_upsert_memory_book_photos(wedding_id, photo_ids[], selected_by)
--     — 원자적 DELETE + INSERT로 큐레이션 교체. 핸들러에서 transaction 안전성 확보.
--
-- 본 파일은 순수 PostgreSQL DDL. RLS는 별도 _rls 파일에서.

BEGIN;

CREATE TABLE public.v3_memory_book_photos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id uuid NOT NULL REFERENCES public.v3_weddings(id) ON DELETE CASCADE,
    photo_id uuid NOT NULL REFERENCES public.v3_shared_photos(id) ON DELETE CASCADE,
    display_order integer NOT NULL,
    selected_by uuid NOT NULL REFERENCES public.v3_users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_mbp_display_order_range CHECK (display_order BETWEEN 1 AND 30),
    CONSTRAINT uq_mbp_wedding_photo UNIQUE (wedding_id, photo_id),
    CONSTRAINT uq_mbp_wedding_order UNIQUE (wedding_id, display_order)
);

-- wedding 단독 조회는 uq_mbp_wedding_photo 좌측 prefix로 커버.
-- display_order 정렬 SELECT를 위한 명시 인덱스.
CREATE INDEX idx_v3_memory_book_photos_wedding_order
    ON public.v3_memory_book_photos USING btree (wedding_id, display_order);

-- ── RPC: 큐레이션 사진 원자적 교체 ─────────────────────────────────────────
-- 호스트가 "저장하기"를 누르면 기존 큐레이션 전체를 새 photo_ids 배열로 교체.
-- DELETE + INSERT를 단일 트랜잭션으로 묶어 중간 상태(0건) 노출 방지.
-- display_order는 배열 순서(WITH ORDINALITY).

CREATE OR REPLACE FUNCTION public.v3_upsert_memory_book_photos(
    p_wedding_id uuid,
    p_photo_ids uuid[],
    p_selected_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.v3_memory_book_photos WHERE wedding_id = p_wedding_id;

    IF array_length(p_photo_ids, 1) > 0 THEN
        INSERT INTO public.v3_memory_book_photos (wedding_id, photo_id, display_order, selected_by)
        SELECT p_wedding_id, photo_id, ordinality, p_selected_by
        FROM unnest(p_photo_ids) WITH ORDINALITY AS t(photo_id, ordinality);
    END IF;
END;
$$;

COMMIT;
