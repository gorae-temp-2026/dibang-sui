-- ============================================
-- Party guest avatars bucket + column (2026-04-24)
-- ============================================

-- 1. party_guests 아바타 URL 컬럼 추가
ALTER TABLE party_guests
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('party-avatars', 'party-avatars', true, 2097152, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage RLS policies (party-avatars)
-- ============================================

-- party-avatars
CREATE POLICY "party-avatars anon insert" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'party-avatars' AND (storage.foldername(name))[1] IS NOT NULL);
CREATE POLICY "party-avatars anon select" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'party-avatars');
CREATE POLICY "party-avatars authenticated insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'party-avatars' AND (storage.foldername(name))[1] IS NOT NULL);
CREATE POLICY "party-avatars anon update" ON storage.objects FOR UPDATE TO anon USING (bucket_id = 'party-avatars');
CREATE POLICY "party-avatars authenticated select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'party-avatars');
CREATE POLICY "party-avatars authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'party-avatars');
