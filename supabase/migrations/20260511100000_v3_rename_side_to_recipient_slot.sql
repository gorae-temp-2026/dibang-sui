-- ============================================================
-- v3 GuestbookEntry: side → recipient_slot 리네임 + CHECK 6종
-- 기존 side 값(groom/bride)은 6종에 포함되므로 마이그레이션 안전
-- ============================================================

ALTER TABLE v3_guestbook_entries RENAME COLUMN side TO recipient_slot;

ALTER TABLE v3_guestbook_entries
    ADD CONSTRAINT chk_guestbook_recipient_slot
        CHECK (recipient_slot IN ('groom','bride','groom_father','groom_mother','bride_father','bride_mother'));
