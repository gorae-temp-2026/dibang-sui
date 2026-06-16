-- ── stickers: 1회성 리액션 (하트, 이모지 등) ──

create table if not exists stickers (
  id             uuid primary key default gen_random_uuid(),
  wedding_id     uuid references weddings not null,
  channel_id     uuid references channels not null,
  guest_name     text not null,
  guest_affil    text,
  guest_user_id  uuid references auth.users,
  side           text,                   -- 'groom' | 'bride'
  host_target    text,                   -- 'groom' | 'bride' | 'groom-father' | 'groom-mother' | 'bride-father' | 'bride-mother'
  type           text not null default 'heart',
  created_at     timestamptz default now()
);

alter table stickers enable row level security;

create policy "anon can select stickers"
  on stickers for select
  to anon
  using (true);

create policy "host reads own stickers"
  on stickers for select
  using (
    wedding_id in (select id from weddings where host1_id = auth.uid() or host2_id = auth.uid())
  );

create policy "guest inserts sticker"
  on stickers for insert
  with check (true);

create index if not exists idx_stickers_wedding_id on stickers(wedding_id);
create index if not exists idx_stickers_wedding_created on stickers(wedding_id, created_at);

alter publication supabase_realtime add table stickers;
