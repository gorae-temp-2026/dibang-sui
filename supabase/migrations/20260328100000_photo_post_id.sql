-- photos 테이블에 post_id 컬럼 추가
-- 같은 업로드 세션(게시물)의 사진들을 묶는 식별자
ALTER TABLE photos ADD COLUMN post_id uuid;
CREATE INDEX idx_photos_post_id ON photos(post_id);
