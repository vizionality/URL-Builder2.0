-- Bot filter: per-client rules that exclude traffic from every GA4 report
-- (dashboard, AI Overview, widgets, cities, client portal). Each rule is one
-- dimension value (a country, city, source / medium, browser, screen size or
-- landing page). clients.bot_filter_enabled switches all of a client's rules.
--
-- RLS enabled with no policies: server-only access via the service role.
create table if not exists public.bot_filters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_slug text not null,
  dimension text not null check (dimension in ('country', 'city', 'sourceMedium', 'browser', 'screenResolution', 'landingPage')),
  value text not null,
  created_by text,
  created_at timestamptz not null default now(),
  unique (user_id, client_slug, dimension, value)
);
alter table public.bot_filters enable row level security;

alter table public.clients add column if not exists bot_filter_enabled boolean not null default true;
