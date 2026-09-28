-- First-party attribution tracking (one-line GTM snippet -> /t.js -> /api/collect).
-- Only the per-client settings live here: the snippet key and extra conversion
-- events. Touches and conversions stream into the app's BigQuery project
-- (dataset `attribution`, created by the app; see src/lib/bigquery.ts).
alter table public.clients add column if not exists tracking_key text unique;
alter table public.clients add column if not exists conversion_events text[] not null default '{}';
