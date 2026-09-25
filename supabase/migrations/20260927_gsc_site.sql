-- Search Console: the site shown on the SEO Dashboard, per user. Uses the same
-- Google connection (refresh token) as GA4.
alter table public.ga4_connections add column if not exists gsc_site_url text;
