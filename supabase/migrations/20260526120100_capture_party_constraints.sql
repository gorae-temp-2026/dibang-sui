-- Party 도메인 dev 누락 마이그레이션 캡처.
-- 분석 근거: _audit/2026-05-26-supabase-dev-drift-analysis/
--
-- 배경:
--   dev에 dashboard로 추가된 CHECK 제약·FK DEFERRABLE 옵션 3개를 파일로 캡처.
--   prod/local엔 신규 ADD, dev엔 이미 있어 IF NOT EXISTS로 no-op.
--   (dev에는 별도로 `supabase migration repair` 로 마킹만 — 실제 SQL은 안 돌게.)
--
-- 멱등성: pg_constraint EXISTS 체크로 보장.

BEGIN;

-- 1. party_actions.type 값 enum 검증
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'party_actions_type_check'
    ) THEN
        ALTER TABLE public.party_actions
            ADD CONSTRAINT party_actions_type_check
            CHECK (type = ANY (ARRAY['sticker'::text, 'message'::text, 'sun'::text, 'moon'::text, 'heart'::text]));
    END IF;
END$$;

-- 2. party_notes.message 길이 제한 (200자)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'party_notes_message_check'
    ) THEN
        ALTER TABLE public.party_notes
            ADD CONSTRAINT party_notes_message_check
            CHECK (char_length(message) <= 200);
    END IF;
END$$;

-- 3. party_actions.party_actions_guest_uid_fkey 를 DEFERRABLE INITIALLY DEFERRED 로 변환
--    트랜잭션 내 guest 행과 action 행 생성 순서 자유.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'party_actions_guest_uid_fkey' AND condeferrable = true
    ) THEN
        ALTER TABLE public.party_actions
            DROP CONSTRAINT IF EXISTS party_actions_guest_uid_fkey;
        ALTER TABLE public.party_actions
            ADD CONSTRAINT party_actions_guest_uid_fkey
            FOREIGN KEY (guest_uid, party_id)
            REFERENCES public.party_guests(uid, party_id)
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END$$;

COMMIT;
