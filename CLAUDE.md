# Project: UTM Builder Dashboard

## Goal
A 6-page dashboard app for building, standardizing, and tracking UTM campaign URLs,
with real GA4 reporting.

## Shared layout (match the mockups)
- Left sidebar: green logo block "UTMBuilder", subtitle "Campaign Tracker".
  Nav items with lucide-react icons, in order: UTM Builder, Bulk Builder,
  Campaign Creator, Dashboard, Integrations, UTM Options. Active item highlighted light green.
- Top header per page: title + subtitle left; Export and Save buttons right (Save = green primary).
- Light theme, rounded cards, soft borders, subtle shadows, green accent. Mobile-friendly.

## Pages
### UTM Builder (/)
- Three stat cards: Active Campaigns (real, distinct campaigns from saved/bulk data,
  label "From bulk builder"), Clicks (from GA4 if connected, else labeled sample),
  Engagement Rate (from GA4 if connected, else labeled sample).
- Two columns: "Build Your UTM URL" form (Website URL*, UTM Source*, UTM Medium*,
  UTM Campaign*, free-text with helper text, Clear Form) and "Generated UTM URL" card
  (live assembled URL + copy; empty state when blank).

### Bulk Builder (/bulk)
- "Bulk UTM Builder" spreadsheet-style table. Columns: Website URL (text),
  UTM Source (dropdown from options), UTM Medium (dropdown from options),
  UTM Campaign (text), Generated URL (auto, read-only), Actions (delete).
- Buttons: Add Row, Clear All, Copy All URLs. Generated URL updates live per row.

### Campaign Creator (/campaigns)
- Three stat cards: Active Campaigns (from bulk), Campaign Types (4, quarterly),
  Name Format (Standard, year_quarter_initiative).
- Two columns: "Create Campaign Name" form (Year dropdown, Quarter dropdown Q1-Q4,
  Initiative text lowercased+underscored, "AI Initiative Suggestions" textarea +
  "Generate AI Suggestions" button, Clear Form) and "Generated Campaign Name" card
  (output year_quarter_initiative, e.g. 2026_q1_summer_sale; copy).
- AI: POST description to /api/suggest-initiatives, which calls the Anthropic API
  server-side (ANTHROPIC_API_KEY) and returns 3-5 snake_case names. Never client-side.

### Dashboard (/dashboard)
- Date range picker top right. Three chart cards (recharts): Active Campaigns (bar, monthly),
  Clicks (line, daily), Engagement Rate by source (pie). Three summary cards.
- Pulls real GA4 data via /api/ga4/report when a Property ID is saved; otherwise
  clearly-labeled sample data.

### Integrations (/integrations)
- Google Analytics 4 card: GA4 Property ID input (numeric, e.g. 123456789).
  Display the service account email with instructions: "Add this email as a Viewer in
  GA4 Admin > Property Access Management." Save Settings and Clear. Store Property ID.

### UTM Options (/options)
- Three cards (Sources, Mediums, Campaigns): "Add new" input + add button, value chips
  with x to remove, Reset to Defaults. "About UTM Parameters" explainer section.
- These values populate the Bulk Builder dropdowns.

## GA4 integration (real data)
- Reading GA4 uses the Google Analytics Data API + a service account + numeric Property ID
  (NOT the Measurement ID, which only sends data).
- /api/ga4/report: Next.js route using @google-analytics/data, authenticated by the
  service-account JSON in env (GA4_SA_KEY). Accepts propertyId, startDate, endDate,
  reportType; returns rows.
- Dashboard mapping:
  - Active Campaigns: dims [date, sessionCampaignName], metric [sessions].
  - Clicks (line, daily): dim [date], metric [sessions].
  - Engagement Rate by source (pie): dim [sessionSource], metric [engagementRate].
  - Summary: total sessions, distinct active campaigns, avg engagementRate.
  - No Property ID saved -> labeled sample data.

## Data model (localStorage v1)
- utmOptions { sources[], mediums[], campaigns[] }. Defaults:
  sources [google, facebook, newsletter, twitter]; mediums [cpc, banner, email, social];
  campaigns [spring_sale, product_launch, black_friday].
- savedUrls [{ baseUrl, source, medium, campaign, generatedUrl, createdAt }]
- bulkRows [{ id, baseUrl, source, medium, campaign, generatedUrl }]
- ga4PropertyId string

## URL assembly rules (must be correct)
- encodeURIComponent all values; if base already has a query, append with &;
  keep UTMs before any #fragment; trim whitespace; validate base is http(s).

## Env vars (Vercel, server-only)
- GA4_SA_KEY: service account JSON. ANTHROPIC_API_KEY: Campaign Creator AI.

## Rules
- Next.js App Router, Tailwind, recharts, @google-analytics/data. Keep other deps light;
  custom table, no heavy grid libs. One-click copy everywhere.
- Save persists to localStorage; Export downloads relevant data as CSV.
- Any metric not from the app's own data must come from GA4 when connected, or be
  clearly labeled sample data when not. Never present fake numbers as real.

## Auth (accounts)
- Supabase Auth, two methods: email + password, and Continue with Google.
- Use @supabase/ssr for Next.js App Router: browser + server clients, middleware session.
- Pages: sign-up, sign-in, sign-out. Protect the app so only logged-in users reach it;
  redirect logged-out visitors to sign-in.
- Env: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.

## Account page (/account)
- Shows the logged-in user's profile: name, email, avatar (from Google metadata when present),
  sign-in method (Google or email), account created date, last sign-in.
- Edit display name via supabase.auth.updateUser({ data: { full_name } }).
- Change password for email/password users via supabase.auth.updateUser({ password }).
- Sign out. Optional delete-account (needs a server route with the service_role key).
- Reachable from a profile menu in the sidebar.

## Measurement / Signals (indicator engine)
A statistical indicator engine over the connected GA4 property's daily series,
surfaced on `/measurement/signals` under the `(app)` shell.

- Ownership is per-user + `property_id` (this repo has no workspaces / `site_id`).
  Every server query filters on `user_id` and `property_id`.
- `indicator_signals` (migration `20260904_indicator_signals.sql`) stores one
  row per fired signal only. Indicator values are computed on read server-side
  and never persisted, so alerts fire once instead of repeating. RLS is enabled
  with no policies: server-only access via the service role.
- Metrics: sessions, conversions (GA4 keyEvents), conversion rate
  (keyEvents / sessions). Cost-based metrics are blocked on a future Google Ads
  connector and shown disabled, not hidden.
- `lib/indicators/` is pure TypeScript with unit tests. Count metrics use
  classical multiplicative deseasonalization + two-sided CUSUM with a lagged
  baseline and a count-volume guardrail; rate metrics use Wilson score
  intervals. No RSI / MACD / oscillators. The two most recent days are excluded
  from signal generation (GA4 restates recent days) and rendered as provisional.

## Multi-touch attribution (client GTM capture)
A per-client attribution pipeline: an agency account owns one or more tracked
sites; each client installs a generated GTM Custom HTML tag that captures the
ordered touch path and posts it to a keyed collect endpoint. A dashboard
attributes conversions across touches with selectable credit models.

- Migration `20260905_attribution.sql`: `attribution_sites`, `_visitors`,
  `_touches`, `_conversions`, `_identity_links`. RLS enabled with no policies;
  server-only access via the service role. An account (`user_id`) owns sites;
  every other table is scoped by `site_id`, so reads filter by both.
- Ingest is public but keyed: `POST /api/attribution/collect` resolves
  `site_key` to a site and its owner, checks the request Origin against the
  site's `allowed_origins`, caps and sanitizes the payload, derives coarse
  country/region from the ingest IP and then discards the IP, upserts the
  visitor, and inserts new touches (deduped). It never trusts a client
  `user_id`, and is rate-limited per site_key + IP via `lib/rate-limit.ts`.
- Identity is deterministic: `POST /api/attribution/identify` links a
  `visitor_id` to a salted hash of an email, so touches merge across devices
  once the same person identifies on each. No fingerprinting of anonymous users;
  coarse geo only, never precise.
- Collector is same-site (Option A): each client CNAMEs a first-party hostname
  (for example metrics.clientsite.com, stored as the site's `collector_host`) to
  this app as a custom domain, and the GTM tag beacons there. The collect
  endpoint maps the Host header to a site, then sets an HttpOnly first-party
  visitor cookie the server owns, which survives Safari ITP; the snippet keeps a
  localStorage fallback for the first request. The snippet respects GTM Consent
  Mode (`analytics_storage`) and a `dataLayer` `attr_consent` flag.
- `lib/attribution/` is pure TypeScript with unit tests: channel grouping, the
  five credit models (first-touch, last-touch, linear, time-decay, position-based
  40/20/40, each summing to 1.0), and funnel aggregation. Explicit empty states
  (no site, no touches, no conversions).
