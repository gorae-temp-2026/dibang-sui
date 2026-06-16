-- ============================================================
-- v3 Wedding Lounge Feed — 스키마 확장
-- Source: _scenario/wedding-lounge/SCENARIOS.md §1 (DB Schema 변경)
-- 순수 PostgreSQL DDL (RLS는 별도 파일)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1-1. v3_guestbook_entries 확장
-- side, relation_category, relation_detail 추가
-- message를 NOT NULL → nullable로 변경
-- ─────────────────────────────────────────────

ALTER TABLE v3_guestbook_entries
    ALTER COLUMN message DROP NOT NULL;

ALTER TABLE v3_guestbook_entries
    ADD COLUMN side              TEXT,
    ADD COLUMN relation_category TEXT,
    ADD COLUMN relation_detail   TEXT;

-- 기존 데이터가 있을 수 있으므로 먼저 칼럼 추가 후 NOT NULL 제약 별도 적용
-- (기존 row가 없는 깨끗한 상태라면 바로 적용 가능)
ALTER TABLE v3_guestbook_entries
    ALTER COLUMN side SET NOT NULL,
    ALTER COLUMN relation_category SET NOT NULL;

ALTER TABLE v3_guestbook_entries
    ADD CONSTRAINT chk_guestbook_message_len
        CHECK (message IS NULL OR char_length(message) <= 60);

ALTER TABLE v3_guestbook_entries
    ADD CONSTRAINT chk_guestbook_relation_detail_len
        CHECK (relation_detail IS NULL OR char_length(relation_detail) <= 40);

ALTER TABLE v3_guestbook_entries
    ADD CONSTRAINT chk_guestbook_guest_name_len
        CHECK (char_length(guest_name) <= 10);

-- ─────────────────────────────────────────────
-- 1-2. v3_host_announcements 확장
-- is_pinned, deleted_at, updated_at 추가
-- ─────────────────────────────────────────────

ALTER TABLE v3_host_announcements
    ADD COLUMN is_pinned  BOOLEAN     NOT NULL DEFAULT false,
    ADD COLUMN deleted_at TIMESTAMPTZ,
    ADD COLUMN updated_at TIMESTAMPTZ;

ALTER TABLE v3_host_announcements
    ADD CONSTRAINT chk_announcement_message_len
        CHECK (char_length(message) <= 100);

-- ─────────────────────────────────────────────
-- 1-3. v3_feed_hearts (신규)
-- 다형성: target_type + target_id
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_feed_hearts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES v3_users(id) ON DELETE CASCADE,
    target_type TEXT        NOT NULL CHECK (target_type IN ('guestbook_entry', 'host_announcement')),
    target_id   UUID        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_v3_feed_hearts_target ON v3_feed_hearts(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_v3_feed_hearts_user   ON v3_feed_hearts(user_id);

-- ─────────────────────────────────────────────
-- 1-4. v3_feed_comments (신규)
-- 다형성: target_type + target_id
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_feed_comments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES v3_users(id) ON DELETE CASCADE,
    target_type TEXT        NOT NULL CHECK (target_type IN ('guestbook_entry', 'host_announcement')),
    target_id   UUID        NOT NULL,
    message     TEXT        NOT NULL CHECK (char_length(message) <= 50),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_v3_feed_comments_target ON v3_feed_comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_v3_feed_comments_user   ON v3_feed_comments(user_id);
