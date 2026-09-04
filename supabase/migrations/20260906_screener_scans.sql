-- Saved screener scans: a per-user store of scan CONFIGURATIONS only. Scan
-- results are always recomputed live from GA4, so nothing here goes stale; only
-- the parameters persist, so a saved scan can be re-run in one click.
--
-- Ownership and access follow the app's posture: RLS enabled with no policies,
-- all access server-side on the service role with an explicit user_id filter.
create table if not exists public.screener_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  dimension text not null,          -- campaign | source | medium | landingPage
  metric text not null,             -- sessions | conversions
  conditions text[] not null default '{}',  -- cusum | pctBaseline | crossover
  threshold_pct numeric(6,2) not null default 25,
  within_days integer not null default 14,
  min_volume integer not null default 50,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists screener_scans_user_idx
  on public.screener_scans (user_id, created_at desc);

alter table public.screener_scans enable row level security;
