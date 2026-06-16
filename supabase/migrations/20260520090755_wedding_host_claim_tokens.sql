-- ── wedding_host_claim_tokens: 신랑/신부 1회용 클레임 링크 토큰 ──
create table if not exists wedding_host_claim_tokens (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  side        text not null check (side in ('groom', 'bride')),
  token       text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  used_by     uuid references auth.users(id),
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id),
  constraint host_claim_used_requires_user
    check (used_at is null or used_by is not null)
);

alter table wedding_host_claim_tokens enable row level security;

create index if not exists idx_wedding_host_claim_tokens_wedding_id
  on wedding_host_claim_tokens(wedding_id);

create index if not exists idx_wedding_host_claim_tokens_active
  on wedding_host_claim_tokens(wedding_id, side)
  where used_at is null and revoked_at is null;

create index if not exists idx_wedding_host_claim_tokens_used_by
  on wedding_host_claim_tokens(used_by)
  where used_by is not null;
