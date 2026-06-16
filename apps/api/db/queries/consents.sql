-- ============================================
-- Consents — onboarding 동의 게이트 + 마케팅 토글
-- _scenario/2026-05-26-user-consent-onboarding/SCENARIOS.md
-- ============================================

-- name: GetRequiredTermsTypesLatest :many
-- 현행 필수 약관의 terms_type별 최신 버전 행 (게이트 판정 + INSERT 시 mapping).
SELECT td.id, td.terms_type, td.version
FROM public.terms_documents td
JOIN (
    SELECT terms_type, MAX(version) AS max_version
    FROM public.terms_documents
    WHERE is_required = true
    GROUP BY terms_type
) latest
  ON td.terms_type = latest.terms_type AND td.version = latest.max_version
WHERE td.is_required = true
ORDER BY td.terms_type;

-- name: GetTermsDocumentByTypeLatest :one
-- 단일 terms_type의 최신 row (marketing 같은 선택 약관 INSERT용).
SELECT id, terms_type, version, is_required
FROM public.terms_documents
WHERE terms_type = $1
ORDER BY version DESC
LIMIT 1;

-- name: GetMaxRequiredTermsVersion :one
-- 필수 약관 전체 중 최신 버전 (= profiles.terms_version 갱신 기준값).
SELECT COALESCE(MAX(version), 0)::int AS max_version
FROM public.terms_documents
WHERE is_required = true;

-- name: GetProfileTermsVersion :one
-- 유저의 profiles.terms_version. 행 없으면 -1 반환 (CASE WHEN coalesce 트릭은 0 default와 충돌하여 -1로 명시).
SELECT COALESCE(
    (SELECT terms_version FROM public.profiles WHERE user_id = $1),
    -1
)::int AS terms_version;

-- name: UpsertProfileTermsVersion :exec
-- profiles 행 없으면 INSERT, 있으면 terms_version UPDATE.
-- display_name은 INSERT 시에만 사용. v3_users.name을 caller가 넘겨줌.
INSERT INTO public.profiles (user_id, display_name, terms_version)
VALUES ($1, $2, $3)
ON CONFLICT (user_id) DO UPDATE
SET terms_version = EXCLUDED.terms_version,
    updated_at    = now();

-- name: InsertConsentRecord :exec
-- append-only. 마케팅 false도 기록.
INSERT INTO public.consent_records (
    user_id, terms_document_id, agreed, ip_address, user_agent, consent_method
) VALUES ($1, $2, $3, $4::inet, $5, 'checkbox');

-- name: GetLatestMarketingConsent :one
-- 마케팅 terms_type 최신 row의 agreed (없으면 false).
SELECT COALESCE(
    (
        SELECT cr.agreed
        FROM public.consent_records cr
        JOIN public.terms_documents td ON td.id = cr.terms_document_id
        WHERE cr.user_id = $1 AND td.terms_type = 'marketing'
        ORDER BY cr.agreed_at DESC
        LIMIT 1
    ),
    false
)::bool AS marketing_agreed;
