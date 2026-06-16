-- Allow authenticated guests to read weddings they have participated in
-- Root cause: weddings table only had policies for 'anon' and hosts.
-- Authenticated guests (non-host) had no SELECT access → WeddingListPage always showed empty list.
CREATE POLICY "guests can read their weddings"
  ON weddings FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT wedding_id FROM guest_participations
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );
