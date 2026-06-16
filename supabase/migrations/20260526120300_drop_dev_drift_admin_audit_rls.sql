-- dev에 dashboard로 추가된 admin_audit_logs RLS 정책 청산.
-- 분석 근거: _audit/2026-05-26-supabase-dev-drift-analysis/
--
-- 배경:
--   원 마이그(20260404100000_admin_audit_logs.sql) 의도: "service_role only (no client access)"
--   → RLS만 enable, 정책 0개.
--
--   dev에 admin_insert_audit / admin_select_audit 두 정책이 추가됨:
--     INSERT/SELECT TO authenticated WHERE auth.uid() = admin_user_id
--   원 의도 위반(authenticated 유저가 자기 audit row 직접 쓸 수 있음 → audit 신뢰성 훼손).
--   prod·local·코드 어느 곳에서도 미사용. 모든 세션 기록·git 흔적 없음.
--
-- 멱등성: IF EXISTS — prod/local은 정책 원래 없어 no-op, dev에서만 실제 drop.

BEGIN;

DROP POLICY IF EXISTS admin_insert_audit ON public.admin_audit_logs;
DROP POLICY IF EXISTS admin_select_audit ON public.admin_audit_logs;

COMMIT;
