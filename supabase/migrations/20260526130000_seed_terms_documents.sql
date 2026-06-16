-- 약관 메타데이터 v1 시드 — _scenario/2026-05-26-user-consent-onboarding/ 참조.
-- terms_documents는 운영 데이터(prod까지 동일 row 필요)라 마이그레이션 파일로 둠.
-- content_url은 후속 작업으로 약관 본문 페이지 작성 시 실제 경로로 갱신 예정.
-- 멱등성: UNIQUE(terms_type, version)에 의해 동일 row INSERT는 ON CONFLICT DO NOTHING.

BEGIN;

INSERT INTO public.terms_documents (terms_type, version, title, content_url, is_required, effective_from)
VALUES
    ('age_verification', 1, '만 14세 이상 확인', '/terms/age', true, now()),
    ('service',          1, '서비스 이용약관 동의', '/terms/service', true, now()),
    ('privacy',          1, '개인정보 수집·이용 동의', '/terms/privacy', true, now()),
    ('marketing',        1, '마케팅 정보 수신 동의', '/terms/marketing', false, now())
ON CONFLICT (terms_type, version) DO NOTHING;

COMMIT;
