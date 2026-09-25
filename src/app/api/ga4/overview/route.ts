import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { comparisonRange, formatYearMonth } from "@/lib/report";
import { batchRunReports, ga4FailureMessage, Ga4Error, type RawRow } from "@/lib/ga4-api";


function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoDay(v: string | null, fallback: string): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback;
}
function num(r: RawRow | undefined, i = 0): number {
  return Number(r?.metricValues?.[i]?.value ?? 0);
}

// AND of the active medium/campaign filters (plus any extra clause), or {}.
function filterExpr(
  medium: string,
  campaign: string,
  extra?: { fieldName: string; value: string }
) {
  const expressions: unknown[] = [];
  if (medium) expressions.push({ filter: { fieldName: "sessionMedium", stringFilter: { value: medium, matchType: "EXACT" } } });
  if (campaign) expressions.push({ filter: { fieldName: "sessionCampaignName", stringFilter: { value: campaign, matchType: "EXACT" } } });
  if (extra) expressions.push({ filter: { fieldName: extra.fieldName, stringFilter: { value: extra.value, matchType: "EXACT" } } });
  if (expressions.length === 0) return {};
  if (expressions.length === 1) return { dimensionFilter: expressions[0] };
  return { dimensionFilter: { andGroup: { expressions } } };
}

const SCORECARD_METRICS = [
  { name: "screenPageViews" },
  { name: "totalUsers" },
  { name: "newUsers" },
  { name: "sessions" },
  { name: "engagementRate" },
  { name: "averageSessionDuration" },
];

// First day of the month `back` months before the month of `endIso`.
function monthStart(endIso: string, back: number): string {
  const [y, m] = endIso.split("-").map(Number);
  const idx = y * 12 + (m - 1) - back;
  const yy = Math.floor(idx / 12);
  const mm = (idx % 12) + 1;
  return `${yy}-${String(mm).padStart(2, "0")}-01`;
}
function ymKey(y: number, m: number): string {
  return `${y}${String(m).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const today = todayIso();
  const end = isoDay(url.searchParams.get("endDate"), today);
  const defaultStart = `${end.slice(0, 4)}-01-01`;
  const start = isoDay(url.searchParams.get("startDate"), defaultStart);
  const medium = url.searchParams.get("medium") ?? "";
  const campaign = url.searchParams.get("campaign") ?? "";
  // %Δ baseline: "year" = same dates last year, otherwise the previous period.
  const compare = url.searchParams.get("compare") === "year" ? "year" : "period";
  // The medium/campaign dropdown lists don't depend on the filters, so the page
  // asks for them once (options=1) instead of on every filter change.
  const wantOptions = url.searchParams.get("options") === "1";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const conn = await getGa4Connection(user.id);
  if (!conn) return NextResponse.json({ error: "Google Analytics is not connected." }, { status: 501 });
  if (!conn.property_id) return NextResponse.json({ error: "No GA4 property selected." }, { status: 400 });
  const propertyId = conn.property_id;

  let token: string;
  try {
    token = await getAccessToken(conn.refresh_token);
  } catch (err) {
    console.error("GA4 token refresh failed:", err);
    return NextResponse.json({ error: "Google auth expired. Reconnect Google Analytics." }, { status: 401 });
  }

  const prev = comparisonRange(start, end, compare);
  const filt = filterExpr(medium, campaign);
  // Monthly window: 13 displayed months plus 12 more for the prior-year series.
  const displayStart = monthStart(end, 12);
  const windowStart = monthStart(end, 24);

  try {
    const current = [{ startDate: start, endDate: end }];
    const withPrev = [...current, { startDate: prev.start, endDate: prev.end }];
    const reports: unknown[] = [
      // Scorecards: two date ranges -> GA4 appends a dateRange dimension.
      { dateRanges: withPrev, metrics: SCORECARD_METRICS, ...filt },
      {
        dateRanges: withPrev,
        metrics: [{ name: "eventCount" }],
        ...filterExpr(medium, campaign, { fieldName: "eventName", value: "generate_lead" }),
      },
      {
        dateRanges: current,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ desc: true, metric: { metricName: "totalUsers" } }],
        limit: 12,
        ...filt,
      },
      {
        dateRanges: current,
        dimensions: [{ name: "region" }],
        metrics: [{ name: "newUsers" }],
        orderBys: [{ desc: true, metric: { metricName: "newUsers" } }],
        limit: 8,
        ...filt,
      },
      {
        dateRanges: [{ startDate: windowStart, endDate: end }],
        dimensions: [{ name: "yearMonth" }],
        metrics: [{ name: "totalUsers" }],
        ...filt,
      },
      // Geo map: new users for every US state (not just the top few).
      {
        dateRanges: current,
        dimensions: [{ name: "region" }],
        metrics: [{ name: "newUsers" }],
        limit: 100,
        ...filterExpr(medium, campaign, { fieldName: "country", value: "United States" }),
      },
    ];
    if (wantOptions) {
      reports.push(
        {
          dateRanges: current,
          dimensions: [{ name: "sessionMedium" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
          limit: 50,
        },
        {
          dateRanges: current,
          dimensions: [{ name: "sessionCampaignName" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
          limit: 100,
        }
      );
    }

    // Six (or eight) reports -> two batch calls running together: one round
    // trip, and only two requests against GA4's concurrency limit.
    const [scoreRes, leadRes, channelRes, statesRes, monthlyRes, geoRes, medRes = [], campRes = []] =
      await batchRunReports(propertyId, token, reports, request.signal);

    // Scorecards: match rows by their dateRange dimension value.
    const byRange = (rows: RawRow[], range: string) =>
      rows.find((r) => r.dimensionValues?.some((d) => d.value === range));
    const cur = byRange(scoreRes, "date_range_0");
    const pre = byRange(scoreRes, "date_range_1");
    const leadCur = byRange(leadRes, "date_range_0");
    const leadPre = byRange(leadRes, "date_range_1");

    const scorecards = {
      views: { value: num(cur, 0), prev: num(pre, 0) },
      totalUsers: { value: num(cur, 1), prev: num(pre, 1) },
      newUsers: { value: num(cur, 2), prev: num(pre, 2) },
      sessions: { value: num(cur, 3), prev: num(pre, 3) },
      engagementRate: { value: num(cur, 4) * 100, prev: num(pre, 4) * 100 },
      avgSessionDuration: { value: num(cur, 5), prev: num(pre, 5) },
      generateLead: { value: num(leadCur, 0), prev: num(leadPre, 0) },
    };

    const channelGroup = channelRes
      .map((r) => ({ channel: r.dimensionValues?.[0]?.value ?? "(other)", users: num(r) }))
      .filter((c) => c.users > 0);

    const topStates = statesRes
      .map((r) => ({ region: r.dimensionValues?.[0]?.value ?? "(not set)", newUsers: num(r) }))
      .filter((s) => s.newUsers > 0);

    const geo = geoRes
      .map((r) => ({ region: r.dimensionValues?.[0]?.value ?? "", newUsers: num(r) }))
      .filter((s) => s.region && !s.region.startsWith("(") && s.newUsers > 0);

    // Monthly: map yearMonth -> users, then align current vs prior year.
    const usersByYm = new Map<string, number>();
    for (const r of monthlyRes) usersByYm.set(r.dimensionValues?.[0]?.value ?? "", num(r));
    const monthly: { month: string; current: number; previousYear: number }[] = [];
    const [sy, sm] = displayStart.split("-").map(Number);
    for (let i = 0; i < 13; i++) {
      const idx = sy * 12 + (sm - 1) + i;
      const y = Math.floor(idx / 12);
      const m = (idx % 12) + 1;
      const key = ymKey(y, m);
      const prevKey = ymKey(y - 1, m);
      monthly.push({
        month: formatYearMonth(key),
        current: usersByYm.get(key) ?? 0,
        previousYear: usersByYm.get(prevKey) ?? 0,
      });
    }

    const names = (rows: RawRow[]) =>
      rows.map((r) => (r.dimensionValues?.[0]?.value ?? "").trim()).filter((v) => v && !v.startsWith("("));

    return NextResponse.json({
      scorecards,
      channelGroup,
      topStates,
      geo,
      monthly,
      filters: wantOptions ? { mediums: names(medRes), campaigns: names(campRes) } : null,
      range: { startDate: start, endDate: end },
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    // The browser moved on (filter changed / page left): not a failure.
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    console.error("overview: GA4 report failed:", err);
    // 429 quota answers read as 429 so the client can tell them apart.
    const status = err instanceof Ga4Error && err.status === 429 ? 429 : 502;
    return NextResponse.json({ error: ga4FailureMessage(err) }, { status });
  }
}
