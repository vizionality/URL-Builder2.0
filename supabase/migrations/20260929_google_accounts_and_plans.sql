-- Agency mode phase 2: several Google logins per user, and plans.
--
-- google_accounts: one row per connected Google login (refresh token). Each
-- client points at the login its GA4 property and Search Console site come
-- from. ga4_connections stays as the user's default login.
-- user_plans: 'business' (1 client, 1 Google login) or 'agency' (unlimited).
--
-- RLS enabled with no policies: server-only access via the service role.
create table if not exists public.google_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  refresh_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email)
);
alter table public.google_accounts enable row level security;

alter table public.clients add column if not exists google_account_id uuid references public.google_accounts (id) on delete set null;
alter table public.clients add column if not exists gsc_google_account_id uuid references public.google_accounts (id) on delete set null;

create table if not exists public.user_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'business' check (plan in ('business', 'agency')),
  updated_at timestamptz not null default now()
);
alter table public.user_plans enable row level security;

-- Existing logins become each user's first Google account, and existing
-- clients point at it.
insert into public.google_accounts (user_id, email, refresh_token)
select user_id, coalesce(email, 'unknown'), refresh_token from public.ga4_connections
on conflict (user_id, email) do nothing;

update public.clients c
set google_account_id = g.id, gsc_google_account_id = g.id
from public.ga4_connections k
join public.google_accounts g on g.user_id = k.user_id and g.email = coalesce(k.email, 'unknown')
where c.user_id = k.user_id and c.google_account_id is null;
