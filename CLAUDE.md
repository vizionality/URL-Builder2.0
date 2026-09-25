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
- A GA4 report modeled on the Hearthside Looker Studio dashboard. Header: session medium
  and session campaign dropdowns plus a Looker-style date picker (presets with This/Last submenus, Include today, Start/End calendars; default This year to date).
- Tiles: seven summary scorecards (Views, Total users, New users, Sessions, Engagement rate,
  Avg session duration, Generate Lead) with %Δ vs the previous period; Total Users Overview
  (monthly, this year vs previous year; metric dropdown: total/new/returning users, sessions,
  engaged sessions); Channel Group pie; Top States bar; US Geo Map (metric dropdowns on the pie,
  on Top States shared with the map and its city view, and on Top Traffic Sources: total/new
  users, sessions, engaged sessions, key events; Top Traffic Sources omits key events)
  choropleth (react-simple-maps + us-atlas, bundled, no runtime fetch); Top Traffic Sources,
  Landing Pages, and Conversions (by default as separate 50/50 table and trend cards, `<section>.table` /
  `<section>.trend`; the combined full-width card stays in the catalog), each a paginated table plus a trend with a Day/Week/Month/Quarter
  grain (rolled up in the browser; total users is bucketed by GA4 since users can't be summed).
- Data: `/api/ga4/overview` (scorecards, monthly, channel, states, geo, filter options) and
  `/api/ga4/breakdowns` (sources, pages, conversions). Per-user OAuth, computed on read.
  Pure formatters live in `lib/report.ts` (unit-tested).
- Filters: search-and-select multi-selects (medium, campaign, source, page path) plus
  cross-filters set by clicking a chart (source/medium cells, landing page, channel slice,
  Top States bar), shown as removable chips. Shared parsing in `lib/ga4-filters.ts`.
  Clicking a Geo Map state zooms in to a city heat map plus a ranked list (`/api/ga4/cities`).
  City coordinates come from `src/data/us-cities.json` and `src/data/ca-cities.json` (GeoNames,
  CC BY 4.0), server-side only. The World map's North America view shades US states and Canadian
  provinces (`src/data/canada-provinces.json`, Natural Earth, public domain) and drills into one for
  a city heat map (`/api/ga4/cities?country=`).
- Customizable layout: a "Customize" right sidebar lists the widget catalog (`lib/dashboard-widgets.ts`,
  unit-tested) with search, add/remove and Reset to default. The ordered widget ids save per user +
  property in `dashboard_layouts` (migration `20260925_dashboard_layouts.sql`, RLS-no-policies) via
  `GET/PUT/DELETE /api/dashboard/layout`. The overview and breakdowns routes take `parts` so hidden
  widgets cost no GA4 requests. Drag and drop (@dnd-kit): grip handles reorder widgets, catalog items
  drag onto the dashboard, and widgets drag back to the sidebar to remove (`applyDrop`, unit-tested).
  Widths: a 12-column row; drag a widget's right edge to resize (25/33/50/75/100%, arrow keys too).
  Saved as "id|span" entries in the same `widgets` array. A non-full widget dropped on a full-width
  one pairs them 50/50 (`dropWithSpans`). All scorecards share one Summary row.
  Shrinking a widget leaves an empty slot ("gap:<n>|span", dashed "drag a widget here" box) instead of
  pulling the next widget up (`resizeWithGap`); dropping a widget on a slot fills it at its width.
  `normalizeLayout` keeps rows explicit after every change: unused row width is a slot, neighbouring
  slots merge, slot-only rows disappear. Moving a widget to another row or removing it leaves a slot.
  Any card fits anywhere: a scorecard dropped in a slot or beside a widget stands on its own (it gets a
  width, `inSummary` false); dropped on a Summary scorecard or added with Add, it joins the Summary row.
  Chart types: the Customize panel has a chart-type picker (number, line, area, bar, donut, pie, map,
  stacked area, horizontal bar, table). Picking one lists every card in that chart: metrics as numbers
  or over time, breakdowns (channel, source, device, country, ...) as donut/pie/bars/table, and US /
  world maps. Generated in `lib/chart-widgets.ts` (ids `c.<chart>.<subject>`, unit-tested), fetched via
  `/api/ga4/widgets` (request id `id~metric` for cards with a metric dropdown, `id@week` etc. for a time
  chart's grain, bucketed by GA4 date ranges so users and rates stay correct). World shapes: world-atlas.
  Undo/redo (buttons, Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z) covers the last 50 layout changes this visit.
  Version history: `dashboard_layout_versions` (migration `20260926_dashboard_layout_versions.sql`,
  RLS-no-policies) snapshots each save, grouping edits within 10 minutes into one version and keeping
  the newest 30 per user + property. `GET /api/dashboard/layout/versions` lists them; the Customize
  panel's History tab restores one (a restore is saved as its own version and can be undone).
  Extra GA4 widgets (off by default): bounce rate, views per session, engaged sessions, event count,
  key events scorecards; device, new vs returning, browsers, countries, cities, sessions by hour;
  Top Pages and Campaigns tables. Specs in `lib/extra-widgets.ts` (unit-tested), served by
  `GET /api/ga4/widgets?ids=` (one report each, batched, only for widgets on the layout).
- No property connected -> a connect-GA4 prompt, not sample data.
- Pages: tabs under the header (`components/dashboard/DashboardTabs.tsx`): Google Analytics (/dashboard),
  SEO Dashboard (/dashboard/seo), Social Media (/dashboard/social), and a More menu to create, name and
  delete custom pages (/dashboard/p/[id], names kept in localStorage `dashboardPages`). Pages other than
  Google Analytics are blank for now: grey dashed outlines where the GA cards sit.
- SEO Dashboard (/dashboard/seo): Google Search Console via the same Google OAuth connection (scope
  webmasters.readonly; older connections reconnect once). The site is picked on Integrations and saved in
  `ga4_connections.gsc_site_url` (migration `20260927_gsc_site.sql`). `GET /api/gsc/sites`, `POST /api/gsc/site`,
  `GET /api/gsc/report` (totals + previous period, daily, queries, pages, countries, devices). Pure helpers
  in `lib/gsc-report.ts` (unit-tested), API calls in `lib/gsc.ts`.

### Integrations (/integrations)
- A tile per platform (icon, name, status) linking to its setup page: /integrations/google-analytics
  (GA4 connect, property, BigQuery link test, Reconnect) and /integrations/search-console. OAuth start takes
  `?return=` to land back on the right page.
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

## Screener (indicator scan)
`/screener` runs the indicator engine across many GA4 dimension values (campaign,
source, medium, landing page) and returns the ones triggering a condition (CUSUM
break, percent off baseline, SMA crossover), ranked, with a volume floor.

- `lib/indicators/screen.ts` is the pure scan engine (unit-tested).
- `GET /api/ga4/screen` reports `[date, dimension] x metric` over a 400-day
  lookback, caps to the top 100 values by metric, and runs the scan. Results are
  computed on read and never persisted.
- Clicking a result deep-links into `/measurement/signals?dimension=&value=&metric=`,
  which applies a GA4 dimensionFilter and charts that one value (compute-only, not
  persisted or acknowledgeable).
- Saved scans persist only the CONFIG (migration `20260906_screener_scans.sql`,
  `screener_scans`, RLS-no-policies, scoped by `user_id`); results are always
  recomputed live, so a saved scan never goes stale. `GET/POST/DELETE
  /api/screener/scans` manage them; names are auto-suggested from the config.
