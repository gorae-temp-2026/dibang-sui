-- shared 사진 100장 제한 COUNT 쿼리 최적화
-- (wedding_id, photo_type, guest_user_id) 3컬럼 필터를 단일 인덱스 스캔으로 처리
CREATE INDEX IF NOT EXISTS idx_photos_wedding_type_user
  ON photos (wedding_id, photo_type, guest_user_id);
