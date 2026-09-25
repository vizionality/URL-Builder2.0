-- Dashboard layout version history: snapshots of a user's widget layout per
-- GA4 property, so an earlier layout can be restored. Edits made within a few
-- minutes of each other update one snapshot instead of creating many; only the
-- most recent 30 per user + property are kept (both enforced by the app).
--
-- Ownership and access follow the app's posture: RLS enabled with no policies,
-- all access server-side on the service role with an explicit user_id filter.
create table if not exists public.dashboard_layout_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id text not null,
  widgets text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dashboard_layout_versions_owner_idx
  on public.dashboard_layout_versions (user_id, property_id, updated_at desc);

alter table public.dashboard_layout_versions enable row level security;
