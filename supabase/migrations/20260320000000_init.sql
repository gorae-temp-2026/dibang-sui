-- ============================================================
-- Gorae Universe — Clean Unified Schema
-- v1.final7의 6개 migration을 1개로 통합한 clean 스키마
-- gifts 테이블 제외 (messages + cash_gifts로 분리됨)
-- 결제(toss_payment_key, toss_id) 제외
-- ============================================================


-- ── 1. weddings ──────────────────────────────────────────────

create table if not exists weddings (
  id                 uuid primary key default gen_random_uuid(),
  host_id            uuid references auth.users default auth.uid() not null,
  groom_name         text not null,
  bride_name         text not null,
  groom_father_name  text,
  groom_mother_name  text,
  bride_father_name  text,
  bride_mother_name  text,
  date               date not null,
  time               text,               -- 'HH:MM'
  end_time           text,
  venue              text,
  venue_address      text,
  wedding_type       text,               -- 'separate' | 'simultaneous'
  status             text default 'active',
  host_role          text,               -- 'groom' | 'bride'
  photo_url          text,
  created_at         timestamptz default now()
);

alter table weddings enable row level security;

create policy "host can manage own weddings"
  on weddings for all
  using (host_id = auth.uid())
  with check (host_id = auth.uid());

create policy "anon can select weddings"
  on weddings for select
  to anon
  using (true);

create index if not exists idx_weddings_host_id on weddings(host_id);
create index if not exists idx_weddings_date on weddings(date);


-- ── 2. channels ──────────────────────────────────────────────

create table if not exists channels (
  id              uuid primary key default gen_random_uuid(),
  wedding_id      uuid references weddings not null,
  label           text not null,         -- '신랑 측', '신부 측'
  side            text not null,         -- 'groom' | 'bride'
  account_bank    text,
  account_no      text,
  account_holder  text,
  kakao_pay_id    text,
  created_at      timestamptz default now(),

  constraint unique_wedding_side unique (wedding_id, side)
);

alter table channels enable row level security;

create policy "host reads own channels"
  on channels for select
  using (
    wedding_id in (select id from weddings where host_id = auth.uid())
  );

create policy "host inserts channels"
  on channels for insert
  with check (
    wedding_id in (select id from weddings where host_id = auth.uid())
  );

create policy "host updates own channels"
  on channels for update
  using (
    wedding_id in (select id from weddings where host_id = auth.uid())
  );

create policy "anon can select channels"
  on channels for select
  to anon
  using (true);

create index if not exists idx_channels_wedding_id on channels(wedding_id);


-- ── 3. messages ──────────────────────────────────────────────

create table if not exists messages (
  id             uuid primary key default gen_random_uuid(),
  wedding_id     uuid references weddings not null,
  channel_id     uuid references channels not null,
  guest_name     text not null,
  guest_affil    text,
  guest_user_id  uuid references auth.users,
  message        text,
  is_heart       boolean default false,
  is_private     boolean default false,
  side           text,                   -- 'groom' | 'bride'
  host_target    text,                   -- 'groom' | 'bride' | 'groom-father' | 'groom-mother' | 'bride-father' | 'bride-mother'
  created_at     timestamptz default now()
);

alter table messages enable row level security;

create policy "host reads own messages"
  on messages for select
  using (
    wedding_id in (select id from weddings where host_id = auth.uid())
  );

create policy "anon can select messages"
  on messages for select
  to anon
  using (true);

create policy "guest inserts message"
  on messages for insert
  with check (true);

create index if not exists idx_messages_wedding_id on messages(wedding_id);
create index if not exists idx_messages_wedding_created on messages(wedding_id, created_at);

alter publication supabase_realtime add table messages;


-- ── 4. cash_gifts ─────────────────────────────────────────────

create table if not exists cash_gifts (
  id             uuid primary key default gen_random_uuid(),
  wedding_id     uuid references weddings not null,
  channel_id     uuid references channels not null,
  message_id     uuid references messages,  -- 연결된 메시지 (optional)
  guest_name     text not null,
  guest_affil    text,
  guest_phone    text,
  guest_temp_id  text,
  guest_user_id  uuid references auth.users,
  amount         integer not null,
  pay_method     text,                      -- 'kakaopay' | 'transfer' | 'cash' | 'gorae-pay'
  pay_confirmed  boolean default false,
  side           text,                      -- 'groom' | 'bride'
  host_target    text,
  attended       boolean default false,
  thanks_sent    boolean default false,
  submitted_at   timestamptz,
  opened_at      timestamptz,
  created_at     timestamptz default now()
);

alter table cash_gifts enable row level security;

create policy "host reads own cash_gifts"
  on cash_gifts for select
  using (
    wedding_id in (select id from weddings where host_id = auth.uid())
  );

create policy "host updates own cash_gifts"
  on cash_gifts for update
  using (
    wedding_id in (select id from weddings where host_id = auth.uid())
  );

create policy "guest inserts cash_gift"
  on cash_gifts for insert
  with check (true);

-- 금액 비노출 원칙: anon은 amount 컬럼 조회 불가
revoke select (amount) on cash_gifts from anon;

create index if not exists idx_cash_gifts_wedding_id on cash_gifts(wedding_id);
create index if not exists idx_cash_gifts_channel_id on cash_gifts(channel_id);
create index if not exists idx_cash_gifts_wedding_created on cash_gifts(wedding_id, created_at);

alter publication supabase_realtime add table cash_gifts;


-- ── 5. tickets ───────────────────────────────────────────────

create table if not exists tickets (
  id            uuid primary key default gen_random_uuid(),
  wedding_id    uuid references weddings not null,
  cash_gift_id  uuid references cash_gifts,
  guest_name    text not null,
  ticket_no     integer not null,         -- 1, 2, 3...
  qr_data       text not null,            -- 'GORAE:TICKET:{weddingId}:{guestName}:{token}:{timestamp}'
  scanned_at    timestamptz,              -- null = 미사용
  created_at    timestamptz default now()
);

alter table tickets enable row level security;

create policy "host manages own tickets"
  on tickets for all
  using (
    wedding_id in (select id from weddings where host_id = auth.uid())
  );

create policy "guest inserts ticket"
  on tickets for insert
  with check (true);

create index if not exists idx_tickets_wedding_id on tickets(wedding_id);

alter publication supabase_realtime add table tickets;


-- ── 6. photos ────────────────────────────────────────────────

create table if not exists photos (
  id                 uuid primary key default gen_random_uuid(),
  wedding_id         uuid references weddings not null,
  guest_name         text not null,
  guest_affiliation  text,
  image_url          text not null,
  caption            text,
  is_keepsake        boolean default false,
  uploaded_at        timestamptz default now()
);

alter table photos enable row level security;

create policy "host manages own photos"
  on photos for all
  using (
    wedding_id in (select id from weddings where host_id = auth.uid())
  )
  with check (
    wedding_id in (select id from weddings where host_id = auth.uid())
  );

create policy "guest inserts photo"
  on photos for insert
  with check (true);

create policy "anon can select photos"
  on photos for select
  to anon
  using (true);

alter publication supabase_realtime add table photos;


-- ── 7. guest_participations ───────────────────────────────────

create table if not exists guest_participations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users not null,
  wedding_id       uuid references weddings not null,
  side             text,                 -- 'groom' | 'bride'
  host_target      text,                 -- 'groom' | 'bride' | 'groom-father' | ...
  recipient_label  text,                 -- UI 표시용: '신랑 측', '신부 어머니의 하객'
  amount_given     integer default 0,    -- 보낸 축의금 총액
  attended         boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),

  unique(user_id, wedding_id)
);

alter table guest_participations enable row level security;

create policy "user reads own participations"
  on guest_participations for select
  using (user_id = auth.uid());

create policy "user inserts own participation"
  on guest_participations for insert
  with check (user_id = auth.uid());

create policy "user updates own participation"
  on guest_participations for update
  using (user_id = auth.uid());

create policy "host reads wedding participations"
  on guest_participations for select
  using (
    wedding_id in (select id from weddings where host_id = auth.uid())
  );

create index if not exists idx_gp_user_id on guest_participations(user_id);
create index if not exists idx_gp_wedding_id on guest_participations(wedding_id);
create index if not exists idx_gp_user_wedding on guest_participations(user_id, wedding_id);
