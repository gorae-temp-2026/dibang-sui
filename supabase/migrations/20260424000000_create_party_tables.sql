-- ============================================
-- Party tables (current dev schema, 2026-04-24)
-- ============================================

-- 1. parties
CREATE TABLE parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. party_guests
CREATE TABLE party_guests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uid uuid NOT NULL DEFAULT gen_random_uuid(),
  nickname text NOT NULL,
  hearts_received integer NOT NULL DEFAULT 0,
  party_id uuid NOT NULL REFERENCES parties(id),
  side text DEFAULT NULL,
  note_consented_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_guest_party UNIQUE (uid, party_id)
);
CREATE INDEX idx_party_guests_party ON party_guests (party_id);

-- 3. party_actions
CREATE TABLE party_actions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guest_uid uuid NOT NULL,
  type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  party_id uuid NOT NULL REFERENCES parties(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT party_actions_guest_uid_fkey FOREIGN KEY (guest_uid, party_id) REFERENCES party_guests(uid, party_id)
);
CREATE INDEX idx_party_actions_party_created ON party_actions (party_id, created_at);

-- 4. party_notes
CREATE TABLE party_notes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_uid uuid NOT NULL,
  receiver_uid uuid NOT NULL,
  message text NOT NULL,
  party_id uuid NOT NULL REFERENCES parties(id),
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_party_notes_sender ON party_notes (party_id, sender_uid);
CREATE INDEX idx_party_notes_receiver ON party_notes (party_id, receiver_uid);

-- ============================================
-- RLS
-- ============================================

ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_notes ENABLE ROW LEVEL SECURITY;

-- parties RLS
CREATE POLICY "Allow anon select on parties" ON parties FOR SELECT TO anon USING (true);
CREATE POLICY "admin_select_parties" ON parties FOR SELECT TO authenticated USING (auth.email() = 'admin@gorae.dev');
CREATE POLICY "admin_insert_parties" ON parties FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@gorae.dev');
CREATE POLICY "admin_update_parties" ON parties FOR UPDATE TO authenticated USING (auth.email() = 'admin@gorae.dev') WITH CHECK (auth.email() = 'admin@gorae.dev');
CREATE POLICY "admin_delete_parties" ON parties FOR DELETE TO authenticated USING (auth.email() = 'admin@gorae.dev');

-- party_guests RLS
CREATE POLICY "anon_select_guests" ON party_guests FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_guests" ON party_guests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_guests" ON party_guests FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_select_guests" ON party_guests FOR SELECT TO authenticated USING (auth.email() = 'admin@gorae.dev');
CREATE POLICY "admin_delete_guests" ON party_guests FOR DELETE TO authenticated USING (auth.email() = 'admin@gorae.dev');
CREATE POLICY "authenticated_insert_guests" ON party_guests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "authenticated_update_guests" ON party_guests FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- party_actions RLS
CREATE POLICY "anon_select_actions" ON party_actions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_actions" ON party_actions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "admin_select_actions" ON party_actions FOR SELECT TO authenticated USING (auth.email() = 'admin@gorae.dev');
CREATE POLICY "authenticated_insert_actions" ON party_actions FOR INSERT TO authenticated WITH CHECK (true);

-- party_notes RLS
CREATE POLICY "anon_all" ON party_notes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all_notes" ON party_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_delete_notes" ON party_notes FOR DELETE TO authenticated USING (auth.email() = 'admin@gorae.dev');

-- ============================================
-- RPC
-- ============================================

CREATE OR REPLACE FUNCTION increment_hearts(target_uid uuid, p_party_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE party_guests
  SET hearts_received = hearts_received + 1
  WHERE uid = target_uid AND party_id = p_party_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_hearts(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION increment_hearts(uuid, uuid) TO authenticated;

-- ============================================
-- Realtime
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE party_guests;
ALTER PUBLICATION supabase_realtime ADD TABLE party_actions;
