-- Dashboard layouts: each user's chosen widgets, in order, per GA4 property.
-- Only the widget ids and their order are stored; the data behind them is
-- always read live from GA4.
--
-- Ownership and access follow the app's posture: RLS enabled with no policies,
-- all access server-side on the service role with an explicit user_id filter.
create table if not exists public.dashboard_layouts (
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id text not null,
  widgets text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

alter table public.dashboard_layouts enable row level security;
