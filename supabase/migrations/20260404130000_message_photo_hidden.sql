-- messages에 is_hidden 추가 (모더레이션)
ALTER TABLE messages ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
CREATE INDEX idx_messages_hidden ON messages(wedding_id) WHERE is_hidden = false;

-- photos에 is_hidden 추가 (모더레이션)
ALTER TABLE photos ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;
CREATE INDEX idx_photos_hidden ON photos(wedding_id) WHERE is_hidden = false;
