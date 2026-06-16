-- R2 (모델 Y): LoungeEntry 그레인 전환 + visit_type/is_attended 제거
--   입장 = v3_lounge_entries(user_id, lounge_id) 존재
--   현장참석 = v3_guestbook_entries 존재 (is_attended 캐시 불필요)
--   동일인(상태4) = claim된 guest_id 기준
-- 근거: Moi:User 1:1(v3_mois.user_id UNIQUE), MoiGatherPlace:WeddingLounge 1:1
--       (v3_moi_gather_places.lounge_id UNIQUE) → moi_id/moi_gather_place_id는
--       정보량 0의 인다이렉션이므로 user_id/lounge_id로 평탄화.
-- 순수 DDL (RLS·auth 무관). 로컬 psql + Supabase 양쪽 실행 가능.

BEGIN;

-- 1) v3_lounge_entries: 신규 그레인 컬럼 추가
ALTER TABLE v3_lounge_entries ADD COLUMN user_id uuid;
ALTER TABLE v3_lounge_entries ADD COLUMN lounge_id uuid;

-- 2) 백필 (1:1 관계 통해 무손실 환산)
UPDATE v3_lounge_entries le
SET user_id = m.user_id
FROM v3_mois m
WHERE m.id = le.moi_id;

UPDATE v3_lounge_entries le
SET lounge_id = gp.lounge_id
FROM v3_moi_gather_places gp
WHERE gp.id = le.moi_gather_place_id;

-- 3) NOT NULL + FK (입장자는 로그인 유저, Host 가능)
ALTER TABLE v3_lounge_entries ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE v3_lounge_entries ALTER COLUMN lounge_id SET NOT NULL;
ALTER TABLE v3_lounge_entries
    ADD CONSTRAINT v3_lounge_entries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES v3_users(id) ON DELETE CASCADE;
ALTER TABLE v3_lounge_entries
    ADD CONSTRAINT v3_lounge_entries_lounge_id_fkey
    FOREIGN KEY (lounge_id) REFERENCES v3_wedding_lounges(id) ON DELETE CASCADE;

-- 4) 옛 그레인 + visit_type 제거 (해당 컬럼의 FK·인덱스 자동 동반 제거)
ALTER TABLE v3_lounge_entries DROP COLUMN moi_id;
ALTER TABLE v3_lounge_entries DROP COLUMN moi_gather_place_id;
ALTER TABLE v3_lounge_entries DROP COLUMN visit_type;

-- 5) v3_cash_gifts: is_attended 제거 (현장참석은 GuestbookEntry 존재로 도출)
ALTER TABLE v3_cash_gifts DROP COLUMN is_attended;

-- 6) 도출/조회용 인덱스 (4상태·참석수 EXISTS 대칭)
CREATE INDEX IF NOT EXISTS idx_v3_lounge_entries_lounge_user
    ON v3_lounge_entries(lounge_id, user_id);
CREATE INDEX IF NOT EXISTS idx_v3_guestbook_entries_lounge_guest
    ON v3_guestbook_entries(lounge_id, guest_id);

COMMIT;
