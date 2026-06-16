-- ============================================
-- Party Storage buckets + RLS (2026-04-24)
-- dibang-party 버킷은 이미 존재하므로 생성하지 않음
-- ============================================

-- 1. 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('party-stickers', 'party-stickers', true, 5242880, ARRAY['image/png','image/jpeg','image/svg+xml','image/webp']),
  ('party-backgrounds', 'party-backgrounds', true, 10485760, ARRAY['image/png','image/jpeg','image/svg+xml','image/webp']),
  ('party-billboards', 'party-billboards', true, 52428800, ARRAY['image/png','image/jpeg','image/svg+xml','image/webp','video/mp4','video/webm']);

-- ============================================
-- Storage RLS policies (4 buckets × admin/anon × upload/read/update)
-- ============================================

-- dibang-party
CREATE POLICY "admin_upload_dibang_party" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dibang-party' AND (storage.foldername(name))[1] IS NOT NULL);
CREATE POLICY "admin_read_dibang_party" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'dibang-party');
CREATE POLICY "admin_update_dibang_party" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dibang-party');
CREATE POLICY "anon_upload_dibang_party" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'dibang-party');
CREATE POLICY "anon_read_dibang_party" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'dibang-party');

-- party-stickers
CREATE POLICY "admin_upload_party_stickers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'party-stickers' AND (storage.foldername(name))[1] IS NOT NULL);
CREATE POLICY "admin_read_party_stickers" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'party-stickers');
CREATE POLICY "admin_update_party_stickers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'party-stickers');
CREATE POLICY "anon_upload_party_stickers" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'party-stickers');
CREATE POLICY "anon_read_party_stickers" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'party-stickers');

-- party-backgrounds
CREATE POLICY "admin_upload_party_backgrounds" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'party-backgrounds' AND (storage.foldername(name))[1] IS NOT NULL);
CREATE POLICY "admin_read_party_backgrounds" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'party-backgrounds');
CREATE POLICY "admin_update_party_backgrounds" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'party-backgrounds');
CREATE POLICY "anon_upload_party_backgrounds" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'party-backgrounds');
CREATE POLICY "anon_read_party_backgrounds" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'party-backgrounds');

-- party-billboards
CREATE POLICY "admin_upload_party_billboards" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'party-billboards' AND (storage.foldername(name))[1] IS NOT NULL);
CREATE POLICY "admin_read_party_billboards" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'party-billboards');
CREATE POLICY "admin_update_party_billboards" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'party-billboards');
CREATE POLICY "anon_upload_party_billboards" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'party-billboards');
CREATE POLICY "anon_read_party_billboards" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'party-billboards');
