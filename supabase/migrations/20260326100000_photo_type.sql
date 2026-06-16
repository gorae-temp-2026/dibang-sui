-- photos 테이블에 photo_type, guest_user_id 컬럼 추가
-- display: 호스트가 등록한 디스플레이용 사진 (최대 10장)
-- feed: 게스트가 피드에 올린 사진
-- shared: 결혼식 후 게스트가 호스트에게 공유한 사진 (게스트당 최대 30장)

-- 1. photo_type 컬럼
ALTER TABLE photos
  ADD COLUMN photo_type text NOT NULL DEFAULT 'feed'
  CHECK (photo_type IN ('display', 'feed', 'shared'));

-- 2. guest_user_id 컬럼 (shared 제한 검증용)
ALTER TABLE photos
  ADD COLUMN guest_user_id uuid REFERENCES auth.users;

-- 3. 기존 호스트 사진 → display 타입으로 마이그레이션
UPDATE photos SET photo_type = 'display' WHERE guest_name = '호스트';

-- 4. 조회 성능 인덱스
CREATE INDEX idx_photos_wedding_type ON photos(wedding_id, photo_type);
