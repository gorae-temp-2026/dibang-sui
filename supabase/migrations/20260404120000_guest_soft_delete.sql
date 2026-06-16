-- Soft delete support for guest_participations
ALTER TABLE guest_participations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_guest_participations_deleted
  ON guest_participations (deleted_at) WHERE deleted_at IS NOT NULL;

-- Update RLS policies to exclude soft-deleted rows
-- Drop existing SELECT policies and recreate with deleted_at filter
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'guest_participations' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON guest_participations', pol.policyname);
  END LOOP;
END $$;

-- Recreate SELECT policies with soft-delete filter
CREATE POLICY "Users can view own participations"
  ON guest_participations FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Anon can view participations"
  ON guest_participations FOR SELECT TO anon
  USING (deleted_at IS NULL);
