-- v3-uploads 단일 버킷을 public/private 두 버킷으로 분리.
-- 청사진: faea79e fix(photo-sharing) 커밋 본문 §"정석(prod 적용 전 정정 필수)".
--   v3-uploads-public  : mobile-invitation 전용 (Public on, anon GET)
--   v3-uploads-private : memory·share 전용 (Public off, signed URL GET)
-- 백엔드: composePresignedObjectKey가 카테고리별로 bucket 분기. service_role로 INSERT.
-- 로컬 psql 적용 불가 — storage 스키마는 Supabase 전용.
-- 멱등성: insert on conflict, drop policy if exists.

-- ── 버킷 생성 ──
insert into storage.buckets (id, name, public)
values ('v3-uploads-public', 'v3-uploads-public', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('v3-uploads-private', 'v3-uploads-private', false)
on conflict (id) do nothing;

-- ── v3-uploads-public 정책 ──
-- anon/authenticated 모두 SELECT (mobile-invitation 청첩장 공유는 URL 만료 없음)
-- INSERT/UPDATE/DELETE는 service_role만 (정책 미정의 → 기본 deny, service_role은 RLS bypass)
drop policy if exists "v3_uploads_public_read" on storage.objects;
create policy "v3_uploads_public_read"
  on storage.objects for select to public
  using (bucket_id = 'v3-uploads-public');

-- ── v3-uploads-private 정책 ──
-- 인증 유저만 SELECT (signed URL 발급 시 RLS 검증 통과 필요)
-- INSERT/UPDATE/DELETE는 service_role만 (정책 미정의)
drop policy if exists "v3_uploads_private_read" on storage.objects;
create policy "v3_uploads_private_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'v3-uploads-private');
