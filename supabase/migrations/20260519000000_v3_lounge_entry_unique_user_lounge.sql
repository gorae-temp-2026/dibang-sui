-- v3_lounge_entries: enforce one entry per (user_id, lounge_id).
--
-- AUD-0 결정(2026-05-19, 사용자 승인): LoungeEntry = 한 user당 한 lounge에 1건
-- (하객 정체성/멤버십 기록, 재입장해도 행이 늘지 않음). 도메인 불변식
-- DOMAIN_MODEL_SUMMARY.md "동일 (user_id, lounge_id)는 1건(중복 입장 방지)"을
-- 앱 레벨이 아니라 DB로 강제한다(글로벌 규칙: 안전·정석 우선, 생성 경로 2개의
-- race 차단).
--
-- 사전 확인(적용 전 필수): 아래 조회로 중복이 없어야 ADD CONSTRAINT 가 성공한다.
--   SELECT user_id, lounge_id, count(*) FROM public.v3_lounge_entries
--   GROUP BY 1, 2 HAVING count(*) > 1;
-- 중복이 있으면 운영자 판단으로 정리(예: 최신 1건 보존) 후 적용한다. 자동 DELETE는
-- 데이터 손실 위험이 있어 본 마이그레이션에 포함하지 않는다(중복 시 제약 추가가
-- 실패하는 편이 데이터 보존 측면에서 안전하다).
-- 로컬 gorae_v2 기준 2026-05-19 시점 중복 0건 확인됨.
--
-- 기존 비유일 인덱스 idx_v3_lounge_entries_lounge_user(lounge_id, user_id)는
-- 컬럼 순서가 달라 본 UNIQUE(user_id, lounge_id)와 중복되지 않으므로 유지한다
-- (lounge 단위 조회 패턴 대응).

ALTER TABLE public.v3_lounge_entries
    ADD CONSTRAINT v3_lounge_entries_user_lounge_key UNIQUE (user_id, lounge_id);
