-- ============================================================
-- 웨딩메모리북 큐레이션 사진 테이블
-- 호스트가 하객 shared 사진 중 최대 30장을 선택하여 메모리북에 표시
-- ============================================================

CREATE TABLE IF NOT EXISTS memory_book_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id      uuid REFERENCES weddings ON DELETE CASCADE NOT NULL,
  photo_id        uuid REFERENCES photos ON DELETE CASCADE NOT NULL,
  display_order   integer NOT NULL CHECK (display_order BETWEEN 1 AND 30),
  selected_by     uuid REFERENCES auth.users NOT NULL,
  created_at      timestamptz DEFAULT now(),

  CONSTRAINT mbp_unique_wedding_photo UNIQUE (wedding_id, photo_id),
  CONSTRAINT mbp_unique_wedding_order UNIQUE (wedding_id, display_order)
);

ALTER TABLE memory_book_photos ENABLE ROW LEVEL SECURITY;

-- 해당 웨딩 호스트만 CRUD 가능
CREATE POLICY "host manages memory_book_photos"
  ON memory_book_photos FOR ALL
  USING (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)))
  WITH CHECK (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)));

-- wedding_id 단독 조회는 mbp_unique_wedding_photo의 좌측 prefix로 커버
CREATE INDEX idx_mbp_wedding_order ON memory_book_photos(wedding_id, display_order);

-- ── 원자적 큐레이션 사진 교체 함수 ─────────────────────────────────────────
-- DELETE + INSERT를 단일 트랜잭션으로 처리하여 데이터 유실 방지

CREATE OR REPLACE FUNCTION public.upsert_memory_book_photos(
  p_wedding_id uuid,
  p_photo_ids uuid[],
  p_selected_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 기존 큐레이션 삭제
  DELETE FROM memory_book_photos WHERE wedding_id = p_wedding_id;

  -- 새 큐레이션 삽입
  IF array_length(p_photo_ids, 1) > 0 THEN
    INSERT INTO memory_book_photos (wedding_id, photo_id, display_order, selected_by)
    SELECT p_wedding_id, unnest, ordinality, p_selected_by
    FROM unnest(p_photo_ids) WITH ORDINALITY;
  END IF;
END;
$$;
