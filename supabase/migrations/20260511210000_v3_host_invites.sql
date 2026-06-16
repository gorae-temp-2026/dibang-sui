-- ============================================================
-- v3_host_invites — 부모님 초대 테이블
-- Host(신랑/신부)가 양가 부모님을 초대하기 위한 토큰 관리
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_host_invites (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id      UUID        NOT NULL REFERENCES v3_weddings(id) ON DELETE CASCADE,
    slot            TEXT        NOT NULL,  -- groom_father | groom_mother | bride_father | bride_mother
    token           TEXT        NOT NULL UNIQUE,
    status          TEXT        NOT NULL DEFAULT 'pending',  -- pending | accepted | cancelled
    invited_user_id UUID        REFERENCES v3_users(id),  -- 수락 후 할당
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_v3_host_invites_wedding_id ON v3_host_invites(wedding_id);
CREATE INDEX IF NOT EXISTS idx_v3_host_invites_token ON v3_host_invites(token);
