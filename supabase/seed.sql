-- =============================================================================
-- DEV + LOCAL ONLY — prod 적용 금지
-- =============================================================================
-- 테스트용 시드 유저 3명을 auth.users / auth.identities에 INSERT한다.
-- 적용 대상:
--   - 로컬 Supabase (OrbStack, 127.0.0.1:54322) — `supabase db reset` 시 자동 적용
--   - dev Supabase (cvtcogtdbaimcckjkzqy) — 수동 적용
--
-- 적용 방법 (TESTING.md § 시드 적용 절차):
--   - 로컬: supabase db reset (자동)
--   - dev: mcp__supabase-dev__execute_sql 로 본 파일 내용 실행
--          또는 psql "<dev connection string>" -f supabase/seed.sql
--
-- 멱등성: 모든 INSERT가 ON CONFLICT DO NOTHING — 반복 적용 안전.
-- 비밀번호는 dev only. .env.test 의 E2E_TEST_{ROLE}_PASSWORD 와 동기화 필수.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 시드 유저 정의
-- -----------------------------------------------------------------------------
-- | role   | uuid                                 | email                     |
-- |--------|--------------------------------------|---------------------------|
-- | guest  | 11111111-1111-1111-1111-111111111111 | test-guest@example.com    |
-- | host   | 22222222-2222-2222-2222-222222222222 | test-host@example.com     |
-- | cohost | 33333333-3333-3333-3333-333333333333 | test-cohost@example.com   |
--
-- 비밀번호 (공통): test-pass-123
-- -----------------------------------------------------------------------------

-- auth.users INSERT
INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        '11111111-1111-1111-1111-111111111111',
        'authenticated', 'authenticated',
        'test-guest@example.com',
        crypt('test-pass-123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Test Guest","full_name":"테스트 게스트"}'::jsonb,
        NOW(), NOW(),
        '', '', '', ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '22222222-2222-2222-2222-222222222222',
        'authenticated', 'authenticated',
        'test-host@example.com',
        crypt('test-pass-123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Test Host","full_name":"테스트 호스트"}'::jsonb,
        NOW(), NOW(),
        '', '', '', ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        '33333333-3333-3333-3333-333333333333',
        'authenticated', 'authenticated',
        'test-cohost@example.com',
        crypt('test-pass-123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"name":"Test Cohost","full_name":"테스트 공동호스트"}'::jsonb,
        NOW(), NOW(),
        '', '', '', ''
    )
ON CONFLICT (id) DO NOTHING;

-- auth.identities INSERT (provider=email)
-- Supabase는 signInWithPassword 시 identities 테이블도 조회하므로 같이 시드.
INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
)
VALUES
    (
        gen_random_uuid(),
        '11111111-1111-1111-1111-111111111111',
        jsonb_build_object(
            'sub', '11111111-1111-1111-1111-111111111111',
            'email', 'test-guest@example.com',
            'email_verified', true
        ),
        'email',
        '11111111-1111-1111-1111-111111111111',
        NOW(), NOW(), NOW()
    ),
    (
        gen_random_uuid(),
        '22222222-2222-2222-2222-222222222222',
        jsonb_build_object(
            'sub', '22222222-2222-2222-2222-222222222222',
            'email', 'test-host@example.com',
            'email_verified', true
        ),
        'email',
        '22222222-2222-2222-2222-222222222222',
        NOW(), NOW(), NOW()
    ),
    (
        gen_random_uuid(),
        '33333333-3333-3333-3333-333333333333',
        jsonb_build_object(
            'sub', '33333333-3333-3333-3333-333333333333',
            'email', 'test-cohost@example.com',
            'email_verified', true
        ),
        'email',
        '33333333-3333-3333-3333-333333333333',
        NOW(), NOW(), NOW()
    )
ON CONFLICT (provider, provider_id) DO NOTHING;

-- =============================================================================
-- 검증 쿼리 (적용 후 수동 실행 권장)
-- =============================================================================
-- SELECT id, email, raw_user_meta_data->>'name' AS name
-- FROM auth.users
-- WHERE email LIKE 'test-%@example.com'
-- ORDER BY email;
--
-- 예상: 3행 (guest / host / cohost)
-- =============================================================================
