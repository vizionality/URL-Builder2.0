import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { comparisonRange, formatYearMonth } from "@/lib/report";

const DATA_API = "https://analyticsdata.googleapis.com/v1beta";

type RawRow = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };

async function runReport(propertyId: string, token: string, body: unknown): Promise<{ rows: RawRow[] }> {
  const res = await fetch(`${DATA_API}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 runReport ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return { rows: (data.rows ?? []) as RawRow[] };
}

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
    const [scoreRes, leadRes, channelRes, statesRes, monthlyRes, medRes, campRes, geoRes] = await Promise.all([
      // Scorecards: two date ranges -> GA4 appends a dateRange dimension.
      runReport(propertyId, token, {
        dateRanges: [{ startDate: start, endDate: end }, { startDate: prev.start, endDate: prev.end }],
        metrics: SCORECARD_METRICS,
        ...filt,
      }),
      runReport(propertyId, token, {
        dateRanges: [{ startDate: start, endDate: end }, { startDate: prev.start, endDate: prev.end }],
        metrics: [{ name: "eventCount" }],
        ...filterExpr(medium, campaign, { fieldName: "eventName", value: "generate_lead" }),
      }),
      runReport(propertyId, token, {
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ desc: true, metric: { metricName: "totalUsers" } }],
        limit: 12,
        ...filt,
      }),
      runReport(propertyId, token, {
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "region" }],
        metrics: [{ name: "newUsers" }],
        orderBys: [{ desc: true, metric: { metricName: "newUsers" } }],
        limit: 8,
        ...filt,
      }),
      runReport(propertyId, token, {
        dateRanges: [{ startDate: windowStart, endDate: end }],
        dimensions: [{ name: "yearMonth" }],
        metrics: [{ name: "totalUsers" }],
        ...filt,
      }),
      runReport(propertyId, token, {
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "sessionMedium" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
        limit: 50,
      }),
      runReport(propertyId, token, {
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "sessionCampaignName" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
        limit: 100,
      }),
      // Geo map: new users for every US state (not just the top few).
      runReport(propertyId, token, {
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "region" }],
        metrics: [{ name: "newUsers" }],
        limit: 100,
        ...filterExpr(medium, campaign, { fieldName: "country", value: "United States" }),
      }),
    ]);

    // Scorecards: match rows by their dateRange dimension value.
    const byRange = (rows: RawRow[], range: string) =>
      rows.find((r) => r.dimensionValues?.some((d) => d.value === range));
    const cur = byRange(scoreRes.rows, "date_range_0");
    const pre = byRange(scoreRes.rows, "date_range_1");
    const leadCur = byRange(leadRes.rows, "date_range_0");
    const leadPre = byRange(leadRes.rows, "date_range_1");

    const scorecards = {
      views: { value: num(cur, 0), prev: num(pre, 0) },
      totalUsers: { value: num(cur, 1), prev: num(pre, 1) },
      newUsers: { value: num(cur, 2), prev: num(pre, 2) },
      sessions: { value: num(cur, 3), prev: num(pre, 3) },
      engagementRate: { value: num(cur, 4) * 100, prev: num(pre, 4) * 100 },
      avgSessionDuration: { value: num(cur, 5), prev: num(pre, 5) },
      generateLead: { value: num(leadCur, 0), prev: num(leadPre, 0) },
    };

    const channelGroup = channelRes.rows
      .map((r) => ({ channel: r.dimensionValues?.[0]?.value ?? "(other)", users: num(r) }))
      .filter((c) => c.users > 0);

    const topStates = statesRes.rows
      .map((r) => ({ region: r.dimensionValues?.[0]?.value ?? "(not set)", newUsers: num(r) }))
      .filter((s) => s.newUsers > 0);

    const geo = geoRes.rows
      .map((r) => ({ region: r.dimensionValues?.[0]?.value ?? "", newUsers: num(r) }))
      .filter((s) => s.region && !s.region.startsWith("(") && s.newUsers > 0);

    // Monthly: map yearMonth -> users, then align current vs prior year.
    const usersByYm = new Map<string, number>();
    for (const r of monthlyRes.rows) usersByYm.set(r.dimensionValues?.[0]?.value ?? "", num(r));
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
      filters: { mediums: names(medRes.rows), campaigns: names(campRes.rows) },
      range: { startDate: start, endDate: end },
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("overview: GA4 report failed:", err);
    return NextResponse.json({ error: "GA4 report failed. Try again shortly." }, { status: 502 });
  }
}
