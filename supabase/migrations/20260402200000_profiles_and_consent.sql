-- ============================================
-- profiles + terms_documents + consent_records
-- ============================================

-- 1. updated_at 자동 갱신 트리거 함수 (재사용 가능)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. profiles 테이블
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 20),
  terms_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. terms_documents 테이블 (약관 원문 버전 관리)
CREATE TABLE terms_documents (
  id serial PRIMARY KEY,
  terms_type text NOT NULL,
  version integer NOT NULL,
  title text NOT NULL,
  content_url text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(terms_type, version)
);

ALTER TABLE terms_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read terms"
  ON terms_documents FOR SELECT
  TO authenticated
  USING (true);

-- 4. consent_records 테이블 (불변 append-only 감사 로그)
-- user_id FK는 ON DELETE RESTRICT: 유저 삭제 시 동의 기록 보존을 위해 삭제 차단
-- 동의 철회는 agreed=false 인 새 레코드를 INSERT하는 방식으로 처리
CREATE TABLE consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  terms_document_id integer NOT NULL REFERENCES terms_documents(id),
  agreed boolean NOT NULL,
  agreed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  consent_method text NOT NULL DEFAULT 'checkbox',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consent records"
  ON consent_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own consent records"
  ON consent_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX idx_consent_records_terms_doc ON consent_records(terms_document_id);

-- 5. 초기 약관 v1 시드
INSERT INTO terms_documents (terms_type, version, title, content_url, is_required) VALUES
  ('service',          1, '서비스 이용약관',          '/terms/service',   true),
  ('privacy',          1, '개인정보 수집·이용 동의',  '/terms/privacy',   true),
  ('age_verification', 1, '만 14세 이상 확인',        '/terms/age',       true),
  ('marketing',        1, '마케팅 정보 수신 동의',    '/terms/marketing', false);

-- 6. 기존 유저 → profiles 일괄 생성 (terms_version = 0 → 재동의 필요)
INSERT INTO profiles (user_id, display_name, terms_version)
SELECT
  id,
  LEFT(COALESCE(
    raw_user_meta_data->>'full_name',
    split_part(email, '@', 1),
    '사용자'
  ), 20),
  0
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles)
ON CONFLICT (user_id) DO NOTHING;
