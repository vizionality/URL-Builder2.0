-- Builder data per client, synced across devices, and read-only client portals.
--
-- client_data: one JSON value per user + client + key (saved URLs, bulk
-- projects, UTM options, custom dashboard pages). The browser keeps a local
-- copy for speed; this is the copy that follows the user between devices.
-- client_shares: portal links (a random token, optional password hash) that
-- show one client's dashboards read-only without an account.
--
-- RLS enabled with no policies: server-only access via the service role.
create table if not exists public.client_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  client_slug text not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, client_slug, key)
);
alter table public.client_data enable row level security;

create table if not exists public.client_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_slug text not null,
  token text not null unique,
  password_hash text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists client_shares_owner_idx on public.client_shares (user_id, client_slug);
alter table public.client_shares enable row level security;
