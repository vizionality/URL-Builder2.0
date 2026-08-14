-- Per-user Google Analytics OAuth connection.
-- Stores the long-lived refresh token and the selected GA4 property.
-- RLS is enabled with NO policies, so the anon/authenticated keys cannot read
-- these rows at all — only the server (service_role) can, which keeps the
-- refresh token out of the browser.

create table if not exists public.ga4_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  email text,
  property_id text,
  property_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ga4_connections enable row level security;
-- Intentionally no policies: service_role (server) bypasses RLS; clients cannot access.
