-- photo_likes: user_id 기반 식별로 전환
ALTER TABLE photo_likes ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE photo_likes DROP CONSTRAINT IF EXISTS photo_likes_photo_id_guest_name_key;
CREATE UNIQUE INDEX photo_likes_photo_id_user_id_key ON photo_likes (photo_id, user_id);

-- photo_comments: user_id 추가
ALTER TABLE photo_comments ADD COLUMN user_id uuid REFERENCES auth.users(id);
