-- Shared bulk-builder projects (Option A: publish-to-link snapshots).
-- A user publishes a snapshot of one bulk project; anyone signed in who has
-- the link can view it and import a copy. RLS is enabled with NO policies, so
-- only the server (service_role) reads/writes — recipients reach the snapshot
-- through server routes/pages, never with the anon key directly.

create table if not exists public.shared_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.shared_projects enable row level security;
-- Intentionally no policies: service_role (server) bypasses RLS; clients cannot access.
