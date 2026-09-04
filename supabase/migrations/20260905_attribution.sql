-- Multi-touch attribution: per-client sites, visitors, ordered touches,
-- conversions, and deterministic identity links. Adapted to this app's per-user
-- model: an agency account (user_id) owns one or more sites, each identified to
-- the capture snippet by a public site_key. Every row is scoped by site_id, and
-- every site belongs to exactly one user_id, so reads filter by both.
--
-- Ownership and access follow the same posture as the rest of the app: RLS is
-- enabled with no policies, and all reads and writes happen server-side on the
-- service role with an explicit user_id or site_id filter. The collect endpoint
-- is public but keyed: it resolves site_key to a site (and its owner) and never
-- trusts a client-supplied user_id.

-- A tracked site. site_key is a public token embedded in the client's GTM tag;
-- allowed_origins is the CORS allowlist the collect endpoint checks.
create table if not exists public.attribution_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  site_key text not null unique,
  allowed_origins text[] not null default '{}',
  created_at timestamptz default now()
);

create index if not exists attribution_sites_user_idx
  on public.attribution_sites (user_id);

-- One visitor per site. visitor_id is generated client-side (a UUID persisted in
-- cookie plus localStorage); country and region are coarse, derived from the
-- ingest IP which is then discarded. identity_key is a salted hash of an email,
-- set only after a deterministic identify call.
create table if not exists public.attribution_visitors (
  site_id uuid not null references public.attribution_sites (id) on delete cascade,
  visitor_id uuid not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  country text,
  region text,
  identity_key text,
  primary key (site_id, visitor_id)
);

create index if not exists attribution_visitors_identity_idx
  on public.attribution_visitors (site_id, identity_key);

-- One row per marketing touch, in time order. The unique constraint dedupes
-- replays of the same beacon; click_ids holds the ad-network click identifiers
-- as a json object so new ones need no schema change.
create table if not exists public.attribution_touches (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.attribution_sites (id) on delete cascade,
  visitor_id uuid not null,
  occurred_at timestamptz not null,
  source text,
  medium text,
  campaign text,
  term text,
  content text,
  click_ids jsonb not null default '{}',
  referrer text,
  landing_page text,
  is_organic boolean not null default false,
  created_at timestamptz default now(),
  unique (site_id, visitor_id, occurred_at, source, medium, campaign)
);

create index if not exists attribution_touches_path_idx
  on public.attribution_touches (site_id, visitor_id, occurred_at);

create index if not exists attribution_touches_site_time_idx
  on public.attribution_touches (site_id, occurred_at);

-- A conversion event, optionally carrying a value and a known identity.
create table if not exists public.attribution_conversions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.attribution_sites (id) on delete cascade,
  visitor_id uuid not null,
  identity_key text,
  name text not null,
  value numeric(14,2),
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}',
  created_at timestamptz default now()
);

create index if not exists attribution_conversions_site_time_idx
  on public.attribution_conversions (site_id, occurred_at);

create index if not exists attribution_conversions_visitor_idx
  on public.attribution_conversions (site_id, visitor_id);

-- The deterministic cross-device bridge: many visitor_ids can map to one hashed
-- identity, so touches captured on different browsers or devices merge once the
-- same person identifies (for example, logs in) on each.
create table if not exists public.attribution_identity_links (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.attribution_sites (id) on delete cascade,
  identity_key text not null,
  visitor_id uuid not null,
  linked_at timestamptz default now(),
  unique (site_id, identity_key, visitor_id)
);

create index if not exists attribution_identity_links_key_idx
  on public.attribution_identity_links (site_id, identity_key);

-- RLS enabled with NO policies on every table: access is server-side only,
-- through the service role, always filtered by user_id or site_id.
alter table public.attribution_sites enable row level security;
alter table public.attribution_visitors enable row level security;
alter table public.attribution_touches enable row level security;
alter table public.attribution_conversions enable row level security;
alter table public.attribution_identity_links enable row level security;
