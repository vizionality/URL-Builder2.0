-- Team members (agency mode): people who work in an owner's account with a
-- role and, optionally, a subset of clients. The owner's data stays owned by
-- the owner; members act on it. One team per member.
--
-- role: 'admin' (everything, incl. team, clients, Google accounts),
--       'analyst' (edit their clients' dashboards, UTMs, portal links),
--       'viewer' (read-only dashboards).
-- client_slugs: null = all clients.
-- Invites are links (token); accepting sets member_user_id.
--
-- RLS enabled with no policies: server-only access via the service role.
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('admin', 'analyst', 'viewer')),
  client_slugs text[],
  member_user_id uuid references auth.users (id) on delete cascade,
  invite_token text unique,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (owner_id, email)
);
create unique index if not exists team_members_member_idx on public.team_members (member_user_id) where member_user_id is not null;
alter table public.team_members enable row level security;
