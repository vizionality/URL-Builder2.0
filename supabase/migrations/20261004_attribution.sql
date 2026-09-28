-- First-party attribution tracking (one-line GTM snippet -> /t.js -> /api/collect).
-- Touches: one row per visit whose source changes (not per pageview).
-- Conversions: generate_lead / purchase (plus per-client extra events).
-- Visitor ids are random and anonymous; no names, emails or IPs are stored.
-- Raw rows older than 180 days are deleted by the collector.
--
-- RLS enabled with no policies: server-only access via the service role.
alter table public.clients add column if not exists tracking_key text unique;
alter table public.clients add column if not exists conversion_events text[] not null default '{}';

create table if not exists public.attribution_touches (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_slug text not null,
  visitor_id text not null,
  ts timestamptz not null,
  source text not null,
  medium text not null,
  campaign text not null default '',
  click_id_type text,
  landing_path text
);
create index if not exists attribution_touches_visitor_idx on public.attribution_touches (user_id, client_slug, visitor_id, ts);
create index if not exists attribution_touches_ts_idx on public.attribution_touches (user_id, client_slug, ts);
alter table public.attribution_touches enable row level security;

create table if not exists public.attribution_conversions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  client_slug text not null,
  visitor_id text not null,
  ts timestamptz not null,
  event_name text not null,
  value numeric not null default 0,
  currency text,
  transaction_id text
);
create index if not exists attribution_conversions_ts_idx on public.attribution_conversions (user_id, client_slug, ts);
-- Rows without a transaction id never conflict (NULLs are distinct).
create unique index if not exists attribution_conversions_txn_idx
  on public.attribution_conversions (user_id, client_slug, transaction_id);
alter table public.attribution_conversions enable row level security;
