-- Indicator signals: one row per FIRED signal, so an alert fires once instead
-- of repeating. Indicator values themselves are computed on read server-side
-- and never persisted. Adapted from the site-scoped spec to this app's
-- per-user model: keyed by user_id + property_id instead of site_id.
create table if not exists public.indicator_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id text not null,
  metric text not null,
  scope text not null default 'site',
  scope_key text not null default '',
  direction text not null,
  fired_on date not null,
  cusum_value numeric(10,4),
  baseline_mean numeric(14,4),
  baseline_sd numeric(14,4),
  acknowledged_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, property_id, metric, scope, scope_key, direction, fired_on)
);

-- Fast listing of a user's signals for a property, newest first.
create index if not exists indicator_signals_user_property_fired_idx
  on public.indicator_signals (user_id, property_id, fired_on desc);

-- RLS enabled with NO policies: all access is server-side on the service role
-- with an explicit user_id + property_id filter.
alter table public.indicator_signals enable row level security;
