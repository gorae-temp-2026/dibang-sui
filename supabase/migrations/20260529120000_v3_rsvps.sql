-- ============================================================
-- v3 RSVP — 모바일 청첩장 참석 의사 (QA 2026-05-29 G1)
-- 게스트가 청첩장에서 제출, 호스트가 웨딩 리포트 '참석 의사' 탭에서 측별로 조회.
-- 측별 공유 권한(신랑측 3명 공유 / 신랑·신부측 비공유)은 백엔드 핸들러에서 필터
-- (cash_gifts와 동일하게 service_role 쿼리 + 핸들러 권한 검증 패턴, 별도 RLS 없음).
-- 순수 PostgreSQL DDL.
-- ============================================================

CREATE TABLE IF NOT EXISTS v3_rsvps (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id      UUID        NOT NULL REFERENCES v3_weddings(id) ON DELETE CASCADE,
    -- 어느 혼주(측)에게 보내는 응답인지 — 측 판별·공유 권한의 기준
    recipient_slot  TEXT        NOT NULL CHECK (recipient_slot IN ('groom','bride','groom_father','groom_mother','bride_father','bride_mother')),
    guest_name      TEXT        NOT NULL CHECK (char_length(guest_name) <= 20),
    attendance      TEXT        NOT NULL CHECK (attendance IN ('attending','absent')),
    companion_count INTEGER     NOT NULL DEFAULT 0 CHECK (companion_count >= 0 AND companion_count <= 20),
    meal            TEXT        NOT NULL DEFAULT 'undecided' CHECK (meal IN ('yes','no','undecided')),
    -- 동명이인 구분용 휴대폰 뒤 4자리(선택)
    phone_last4     TEXT        CHECK (phone_last4 IS NULL OR phone_last4 ~ '^[0-9]{4}$'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_rsvps_wedding ON v3_rsvps(wedding_id);
