-- Clients (agency mode): each client has its own GA4 property and Search
-- Console site; the app's client-scoped pages live under /c/<slug>/.
-- The Google login (refresh token) stays in ga4_connections, one per user.
--
-- Ownership and access follow the app's posture: RLS enabled with no policies,
-- all access server-side on the service role with an explicit user_id filter.
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null,
  name text not null,
  domain text,
  property_id text,
  property_name text,
  gsc_site_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

alter table public.clients enable row level security;

-- Existing setups become each user's first client.
insert into public.clients (user_id, slug, name, property_id, property_name, gsc_site_url)
select c.user_id,
       coalesce(nullif(trim(both '-' from regexp_replace(lower(coalesce(c.property_name, 'my-client')), '[^a-z0-9]+', '-', 'g')), ''), 'my-client'),
       coalesce(c.property_name, 'My client'),
       c.property_id, c.property_name, c.gsc_site_url
from public.ga4_connections c
where c.property_id is not null
on conflict (user_id, slug) do nothing;
