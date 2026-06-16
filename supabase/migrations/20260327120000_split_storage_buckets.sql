-- 기존 wedding-photos 단일 버킷을 display / feed / shared 3개로 분리

-- 기존 정책 정리
drop policy if exists "storage_photos_delete" on storage.objects;
drop policy if exists "storage_photos_insert" on storage.objects;
drop policy if exists "storage_photos_select" on storage.objects;
drop policy if exists "wedding_photos_delete" on storage.objects;
drop policy if exists "wedding_photos_public_read" on storage.objects;
drop policy if exists "wedding_photos_update" on storage.objects;
drop policy if exists "wedding_photos_upload" on storage.objects;

-- 기존 버킷은 마이그레이션으로 생성된 적 없으므로 삭제 불필요
-- (수동 생성된 경우 Supabase 대시보드 또는 Storage API로 삭제할 것)

-- 버킷 생성 (모두 public — 이미지 URL 직접 접근 필요)
insert into storage.buckets (id, name, public)
values ('wedding-display', 'wedding-display', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('wedding-feed', 'wedding-feed', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('wedding-shared', 'wedding-shared', true)
on conflict (id) do nothing;

-- ── wedding-display: 인증 유저만 업로드/수정/삭제, 누구나 읽기 ──
create policy "display_public_read"
  on storage.objects for select to public
  using (bucket_id = 'wedding-display');

create policy "display_auth_insert"
  on storage.objects for insert to public
  with check (bucket_id = 'wedding-display' and auth.role() = 'authenticated');

create policy "display_auth_update"
  on storage.objects for update to public
  using (bucket_id = 'wedding-display' and auth.role() = 'authenticated');

create policy "display_auth_delete"
  on storage.objects for delete to public
  using (bucket_id = 'wedding-display' and auth.role() = 'authenticated');

-- ── wedding-feed: 누구나 업로드/읽기, 인증 유저만 수정/삭제 ──
create policy "feed_public_read"
  on storage.objects for select to public
  using (bucket_id = 'wedding-feed');

create policy "feed_public_insert"
  on storage.objects for insert to public
  with check (bucket_id = 'wedding-feed');

create policy "feed_auth_update"
  on storage.objects for update to public
  using (bucket_id = 'wedding-feed' and auth.role() = 'authenticated');

create policy "feed_auth_delete"
  on storage.objects for delete to public
  using (bucket_id = 'wedding-feed' and auth.role() = 'authenticated');

-- ── wedding-shared: 인증 유저만 업로드/수정/삭제, 누구나 읽기 ──
create policy "shared_public_read"
  on storage.objects for select to public
  using (bucket_id = 'wedding-shared');

create policy "shared_auth_insert"
  on storage.objects for insert to public
  with check (bucket_id = 'wedding-shared' and auth.role() = 'authenticated');

create policy "shared_auth_update"
  on storage.objects for update to public
  using (bucket_id = 'wedding-shared' and auth.role() = 'authenticated');

create policy "shared_auth_delete"
  on storage.objects for delete to public
  using (bucket_id = 'wedding-shared' and auth.role() = 'authenticated');
