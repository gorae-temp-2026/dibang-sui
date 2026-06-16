-- ============================================================
-- host_id → host1_id (신랑) + host2_id (신부) 분리
-- host_role 컬럼 제거 (역할은 컬럼 위치로 결정)
-- ============================================================

-- 1. 새 컬럼 추가
ALTER TABLE weddings ADD COLUMN host1_id uuid REFERENCES auth.users;
ALTER TABLE weddings ADD COLUMN host2_id uuid REFERENCES auth.users;

-- 2. 데이터 이전 (단일 CASE 문으로 원자적 처리)
-- host_role이 NULL인 행은 groom(host1)으로 처리 (기본값)
UPDATE weddings SET
  host1_id = CASE WHEN host_role = 'bride' THEN NULL ELSE host_id END,
  host2_id = CASE WHEN host_role = 'bride' THEN host_id ELSE NULL END;

-- 3. Helper function 생성 (RLS 정책에서 재사용)
CREATE OR REPLACE FUNCTION public.is_wedding_host(w_host1 uuid, w_host2 uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
AS $$ SELECT auth.uid() IN (w_host1, w_host2) $$;

-- 4. 기존 RLS 정책 DROP (11개)
DROP POLICY IF EXISTS "host can manage own weddings" ON weddings;
DROP POLICY IF EXISTS "host reads own channels" ON channels;
DROP POLICY IF EXISTS "host inserts channels" ON channels;
DROP POLICY IF EXISTS "host updates own channels" ON channels;
DROP POLICY IF EXISTS "host reads own messages" ON messages;
DROP POLICY IF EXISTS "host reads own cash_gifts" ON cash_gifts;
DROP POLICY IF EXISTS "host updates own cash_gifts" ON cash_gifts;
DROP POLICY IF EXISTS "host manages own tickets" ON tickets;
DROP POLICY IF EXISTS "host manages own photos" ON photos;
DROP POLICY IF EXISTS "photos_update_host" ON photos;
-- sync_dev_schema에서 이미 DROP됐지만, 다른 환경 대비 안전장치
DROP POLICY IF EXISTS "host reads wedding participations" ON guest_participations;

-- 5. 새 RLS 정책 (10개)

-- weddings: 직접 체크
CREATE POLICY "host can manage own weddings"
  ON weddings FOR ALL
  USING (is_wedding_host(host1_id, host2_id))
  WITH CHECK (is_wedding_host(host1_id, host2_id));

-- channels (3)
CREATE POLICY "host reads own channels"
  ON channels FOR SELECT
  USING (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)));

CREATE POLICY "host inserts channels"
  ON channels FOR INSERT
  WITH CHECK (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)));

CREATE POLICY "host updates own channels"
  ON channels FOR UPDATE
  USING (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)));

-- messages (1)
CREATE POLICY "host reads own messages"
  ON messages FOR SELECT
  USING (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)));

-- cash_gifts (2)
CREATE POLICY "host reads own cash_gifts"
  ON cash_gifts FOR SELECT
  USING (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)));

CREATE POLICY "host updates own cash_gifts"
  ON cash_gifts FOR UPDATE
  USING (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)));

-- tickets (1)
CREATE POLICY "host manages own tickets"
  ON tickets FOR ALL
  USING (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)));

-- photos (1 — 기존 2개 병합)
CREATE POLICY "host manages own photos"
  ON photos FOR ALL
  USING (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)))
  WITH CHECK (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)));

-- guest_participations (선택적 — 다른 환경에 정책이 존재할 경우 대비)
CREATE POLICY "host reads wedding participations"
  ON guest_participations FOR SELECT
  USING (wedding_id IN (SELECT id FROM weddings WHERE is_wedding_host(host1_id, host2_id)));

-- 6. 인덱스 교체
DROP INDEX IF EXISTS idx_weddings_host_id;
CREATE INDEX idx_weddings_host1_id ON weddings(host1_id);
CREATE INDEX idx_weddings_host2_id ON weddings(host2_id);

-- 7. 레거시 컬럼 삭제
ALTER TABLE weddings DROP COLUMN host_id;
ALTER TABLE weddings DROP COLUMN host_role;

-- 8. 제약조건 추가
-- 최소 한 명의 호스트 필수 (둘 다 NULL 방지)
ALTER TABLE weddings ADD CONSTRAINT weddings_at_least_one_host
  CHECK (host1_id IS NOT NULL OR host2_id IS NOT NULL);
-- 동일 유저 양쪽 등록 방지 (at_least_one_host가 둘 다 NULL을 차단하므로 안전)
ALTER TABLE weddings ADD CONSTRAINT weddings_hosts_differ
  CHECK (host1_id IS DISTINCT FROM host2_id);
