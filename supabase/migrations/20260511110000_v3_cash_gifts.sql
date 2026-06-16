-- ============================================================
-- v3 CashGift — 축의금 기록
-- Source: _scenario/guest-web-flow/SCENARIOS.md §1
-- 순수 PostgreSQL DDL (RLS는 별도 파일)
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_cash_gifts (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id          UUID        NOT NULL REFERENCES v3_weddings(id) ON DELETE CASCADE,
    guest_name          TEXT        NOT NULL CHECK (char_length(guest_name) <= 10),
    guest_id            UUID        REFERENCES v3_users(id),
    recipient_slot      TEXT        NOT NULL CHECK (recipient_slot IN ('groom','bride','groom_father','groom_mother','bride_father','bride_mother')),
    relation_category   TEXT        NOT NULL,
    relation_detail     TEXT        CHECK (relation_detail IS NULL OR char_length(relation_detail) <= 40),
    amount              INTEGER     NOT NULL CHECK (amount >= 0),
    pay_method          TEXT        NOT NULL CHECK (pay_method IN ('transfer','kakaopay','toss')),
    guestbook_entry_id  UUID        REFERENCES v3_guestbook_entries(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_cash_gifts_wedding ON v3_cash_gifts(wedding_id);
