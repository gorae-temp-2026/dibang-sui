-- ============================================================
-- v3 Schema DDL — 도메인 모델 기반
-- Source: _architecture/DOMAIN_MODEL_SUMMARY.md
-- 순수 PostgreSQL DDL (RLS는 별도 파일)
-- ============================================================

-- ─────────────────────────────────────────────
-- User Aggregate
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT        NOT NULL,
    email             TEXT        NOT NULL UNIQUE,
    phone             TEXT,
    profile_image_url TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- Moi Aggregate
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_mois (
    id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID  NOT NULL UNIQUE REFERENCES v3_users(id) ON DELETE CASCADE,
    equipped_items  JSONB NOT NULL DEFAULT '{}'
);

-- ─────────────────────────────────────────────
-- MoiItem Aggregate
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_moi_items (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moi_id     UUID NOT NULL REFERENCES v3_mois(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL,
    slot       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_moi_items_moi_id ON v3_moi_items(moi_id);

-- ─────────────────────────────────────────────
-- Wedding Aggregate
-- (WeddingInfo, Venue, Account는 VO → 컬럼으로 펼침)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_weddings (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    status                TEXT        NOT NULL DEFAULT 'active',

    -- Host 슬롯 (최소 1, 최대 6)
    host_groom_id         UUID        REFERENCES v3_users(id),
    host_bride_id         UUID        REFERENCES v3_users(id),
    host_groom_father_id  UUID        REFERENCES v3_users(id),
    host_groom_mother_id  UUID        REFERENCES v3_users(id),
    host_bride_father_id  UUID        REFERENCES v3_users(id),
    host_bride_mother_id  UUID        REFERENCES v3_users(id),

    -- WeddingInfo (VO)
    groom_name            TEXT        NOT NULL,
    bride_name            TEXT        NOT NULL,
    groom_father_name     TEXT,
    groom_mother_name     TEXT,
    bride_father_name     TEXT,
    bride_mother_name     TEXT,
    date                  DATE        NOT NULL,
    time                  TEXT        NOT NULL,

    -- Venue (VO)
    venue_name            TEXT        NOT NULL,
    venue_address         TEXT        NOT NULL,
    venue_hall            TEXT,

    -- Account (VO × 6, JSONB { "bank": "...", "address": "..." })
    groom_account         JSONB,
    bride_account         JSONB,
    groom_father_account  JSONB,
    groom_mother_account  JSONB,
    bride_father_account  JSONB,
    bride_mother_account  JSONB,

    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_weddings_groom_id ON v3_weddings(host_groom_id);
CREATE INDEX IF NOT EXISTS idx_v3_weddings_bride_id ON v3_weddings(host_bride_id);

-- ─────────────────────────────────────────────
-- WeddingLounge (Wedding 1:1)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_wedding_lounges (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL UNIQUE REFERENCES v3_weddings(id) ON DELETE CASCADE,
    name       TEXT NOT NULL
);

-- ─────────────────────────────────────────────
-- MoiGatherPlace (WeddingLounge 1:1)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_moi_gather_places (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lounge_id UUID NOT NULL UNIQUE REFERENCES v3_wedding_lounges(id) ON DELETE CASCADE,
    type      TEXT NOT NULL
);

-- ─────────────────────────────────────────────
-- MobileInvitation (Wedding 1:1)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_mobile_invitations (
    id                 UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id         UUID  NOT NULL UNIQUE REFERENCES v3_weddings(id) ON DELETE CASCADE,
    design_template_id TEXT  NOT NULL,
    custom_message     TEXT,
    visited_count      INT   NOT NULL DEFAULT 0,
    heart_count        INT   NOT NULL DEFAULT 0,
    gallery_photos     JSONB NOT NULL DEFAULT '[]',
    cover_image        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- MoiVisit Aggregate
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_moi_visits (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    moi_id              UUID        NOT NULL REFERENCES v3_mois(id) ON DELETE CASCADE,
    moi_gather_place_id UUID        NOT NULL REFERENCES v3_moi_gather_places(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_moi_visits_moi_id ON v3_moi_visits(moi_id);
CREATE INDEX IF NOT EXISTS idx_v3_moi_visits_place_id ON v3_moi_visits(moi_gather_place_id);

-- ─────────────────────────────────────────────
-- GuestbookEntry Aggregate
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_guestbook_entries (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lounge_id  UUID        NOT NULL REFERENCES v3_wedding_lounges(id) ON DELETE CASCADE,
    guest_name TEXT        NOT NULL,
    guest_id   UUID        REFERENCES v3_users(id),
    message    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_guestbook_entries_lounge_id ON v3_guestbook_entries(lounge_id);

-- ─────────────────────────────────────────────
-- HostAnnouncement Aggregate
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_host_announcements (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lounge_id  UUID        NOT NULL REFERENCES v3_wedding_lounges(id) ON DELETE CASCADE,
    host_id    UUID        NOT NULL REFERENCES v3_users(id),
    message    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_host_announcements_lounge_id ON v3_host_announcements(lounge_id);

-- ─────────────────────────────────────────────
-- InteriorItem Aggregate
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_interior_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moi_gather_place_id UUID NOT NULL REFERENCES v3_moi_gather_places(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    type                TEXT NOT NULL,
    size                TEXT,
    image               TEXT,
    status              TEXT NOT NULL DEFAULT 'unplaced',
    position            JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_interior_items_place_id ON v3_interior_items(moi_gather_place_id);

-- ─────────────────────────────────────────────
-- Ium Aggregate (신뢰네트워크 엣지)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS v3_iums (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    type         TEXT        NOT NULL,
    label        TEXT        NOT NULL,
    from_user_id UUID        NOT NULL REFERENCES v3_users(id) ON DELETE CASCADE,
    to_user_id   UUID        NOT NULL REFERENCES v3_users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT iums_no_self_link CHECK (from_user_id != to_user_id),
    CONSTRAINT iums_unique_pair UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_v3_iums_from ON v3_iums(from_user_id);
CREATE INDEX IF NOT EXISTS idx_v3_iums_to ON v3_iums(to_user_id);
