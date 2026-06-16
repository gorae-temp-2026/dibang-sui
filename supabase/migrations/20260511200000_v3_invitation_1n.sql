-- ============================================================
-- Wedding : MobileInvitation = 1:N 전환
-- 기존 1:1 UNIQUE 제약 제거, 일반 INDEX 유지
-- ============================================================

-- UNIQUE 제약 제거 (제약명은 PostgreSQL 기본 네이밍: {table}_{column}_key)
ALTER TABLE v3_mobile_invitations
    DROP CONSTRAINT v3_mobile_invitations_wedding_id_key;

-- 조회 성능을 위한 일반 INDEX 추가
CREATE INDEX IF NOT EXISTS idx_v3_mobile_invitations_wedding_id
    ON v3_mobile_invitations(wedding_id);
