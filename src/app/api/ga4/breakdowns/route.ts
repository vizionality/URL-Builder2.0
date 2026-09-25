import { pageFilterExpr, parsePageFilters } from "@/lib/ga4-filters";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { parseGa4Date } from "@/lib/indicators/dates";
import { comparisonRange, parseBreakdownMetric, pivotDaily } from "@/lib/report";
import { batchRunReports, detectKeyMetric, ga4FailureMessage, Ga4Error, type RawRow } from "@/lib/ga4-api";

// Top Traffic Sources, Landing Pages, and Conversions for the Dashboard: each a
// table plus a daily trend for its top items. Same filters and date range as
// /api/ga4/overview. Per-user OAuth, computed on read.

const TOP_SOURCES = 10;
const TREND_SOURCES = 5;
const TOP_PAGES = 10;
const TREND_PAGES = 3;
const TREND_EVENTS = 5;

type Expr = Record<string, unknown>;
const inList = (fieldName: string, values: string[]): Expr => ({
  filter: { fieldName, inListFilter: { values } },
});

const dv = (r: RawRow, i: number) => r.dimensionValues?.[i]?.value ?? "";
const mv = (r: RawRow, i = 0) => Number(r.metricValues?.[i]?.value ?? 0);

function isoDay(v: string | null, fallback: string): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const today = new Date().toISOString().slice(0, 10);
  const end = isoDay(url.searchParams.get("endDate"), today);
  const start = isoDay(url.searchParams.get("startDate"), `${end.slice(0, 4)}-01-01`);
  const filters = parsePageFilters(url.searchParams);
  // What Top Traffic Sources ranks and trends by (the dashboard's dropdown).
  const sourceMetric = parseBreakdownMetric(url.searchParams.get("sourceMetric"), "totalUsers");
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
  const both = [{ startDate: start, endDate: end }, { startDate: prev.start, endDate: prev.end }];
  const cur = [{ startDate: start, endDate: end }];

  try {
    const keyMetric = await detectKeyMetric(propertyId, token, request.signal);
    const srcMetric = sourceMetric === "keyEvents" ? keyMetric : sourceMetric;

    // Wave 1: the three tables in one batch call (and which items to trend).
    const [srcRows, pageRows, convRows] = await batchRunReports(propertyId, token, [
      {
        dateRanges: both,
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [{ name: srcMetric }],
        // Ordered so that if a large property hits the row limit, only the
        // smallest source/medium rows are dropped.
        orderBys: [{ desc: true, metric: { metricName: srcMetric } }],
        limit: 1000,
        ...pageFilterExpr(filters),
      },
      {
        dateRanges: cur,
        dimensions: [{ name: "landingPage" }],
        metrics: [{ name: "sessions" }, { name: "engagementRate" }],
        orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
        limit: TOP_PAGES,
        ...pageFilterExpr(filters),
      },
      {
        dateRanges: both,
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: keyMetric }],
        limit: 200,
        ...pageFilterExpr(filters),
      },
    ], request.signal);

    // Sources: with two date ranges GA4 appends the range as the last dimension.
    const srcMap = new Map<string, { source: string; medium: string; users: number; prev: number }>();
    for (const r of srcRows) {
      const key = `${dv(r, 0)}\u0000${dv(r, 1)}`;
      const entry = srcMap.get(key) ?? { source: dv(r, 0), medium: dv(r, 1), users: 0, prev: 0 };
      if (dv(r, 2) === "date_range_1") entry.prev += mv(r);
      else entry.users += mv(r);
      srcMap.set(key, entry);
    }
    const allSources = [...srcMap.values()].sort((a, b) => b.users - a.users);
    const sources = allSources.filter((s) => s.users > 0).slice(0, TOP_SOURCES);
    const sourceTotal = {
      users: allSources.reduce((sum, s) => sum + s.users, 0),
      prev: allSources.reduce((sum, s) => sum + s.prev, 0),
    };
    // Trend the top distinct source names (a source can appear under two mediums).
    const trendSources = [...new Set(sources.map((s) => s.source))].slice(0, TREND_SOURCES);

    const landingPages = pageRows.map((r) => ({
      page: dv(r, 0) || "(not set)",
      sessions: mv(r, 0),
      engagementRate: mv(r, 1) * 100,
    }));
    const trendPages = landingPages.map((p) => p.page).filter((p) => p !== "(not set)").slice(0, TREND_PAGES);

    const convMap = new Map<string, { event: string; count: number; prev: number }>();
    for (const r of convRows) {
      const event = dv(r, 0);
      const entry = convMap.get(event) ?? { event, count: 0, prev: 0 };
      if (dv(r, 1) === "date_range_1") entry.prev += mv(r);
      else entry.count += mv(r);
      convMap.set(event, entry);
    }
    const conversions = [...convMap.values()]
      .filter((c) => c.count > 0 || c.prev > 0)
      .sort((a, b) => b.count - a.count);
    const trendEvents = conversions.filter((c) => c.count > 0).map((c) => c.event).slice(0, TREND_EVENTS);

    // Wave 2: daily trends for the top items, in one batch call. A trend with
    // nothing to show is left out rather than sent as an empty report.
    const trendReports: { key: "src" | "page" | "conv"; body: unknown }[] = [];
    if (trendSources.length) {
      trendReports.push({ key: "src", body: {
        dateRanges: cur,
        dimensions: [{ name: "date" }, { name: "sessionSource" }],
        metrics: [{ name: srcMetric }],
        limit: 10000,
        ...pageFilterExpr(filters, [inList("sessionSource", trendSources)]),
      } });
    }
    if (trendPages.length) {
      trendReports.push({ key: "page", body: {
        dateRanges: cur,
        dimensions: [{ name: "date" }, { name: "landingPage" }],
        metrics: [{ name: "sessions" }],
        limit: 10000,
        ...pageFilterExpr(filters, [inList("landingPage", trendPages)]),
      } });
    }
    if (trendEvents.length) {
      trendReports.push({ key: "conv", body: {
        dateRanges: cur,
        dimensions: [{ name: "date" }, { name: "eventName" }],
        metrics: [{ name: keyMetric }],
        limit: 10000,
        ...pageFilterExpr(filters, [inList("eventName", trendEvents)]),
      } });
    }
    const trendRows = await batchRunReports(
      propertyId, token, trendReports.map((t) => t.body), request.signal
    );
    const rowsFor = (key: "src" | "page" | "conv"): RawRow[] =>
      trendRows[trendReports.findIndex((t) => t.key === key)] ?? [];
    const srcTrendRows = rowsFor("src");
    const pageTrendRows = rowsFor("page");
    const convTrendRows = rowsFor("conv");

    const long = (rows: RawRow[]) =>
      rows.map((r) => ({ date: parseGa4Date(dv(r, 0)), series: dv(r, 1), value: mv(r) }));

    // Conversions trend: only days with any events, like the Looker grouped bars.
    const convTrend = pivotDaily(long(convTrendRows), trendEvents);
    convTrend.data = convTrend.data.filter((row) =>
      convTrend.series.some((s) => Number(row[s.key]) > 0)
    );

    return NextResponse.json({
      sources,
      sourceTotal,
      sourceCount: allSources.filter((s) => s.users > 0).length,
      sourceTrend: pivotDaily(long(srcTrendRows), trendSources),
      landingPages,
      pageTrend: pivotDaily(long(pageTrendRows), trendPages),
      conversions,
      conversionTrend: convTrend,
      keyMetric,
      range: { startDate: start, endDate: end },
    });
  } catch (err) {
    // The browser moved on (filter changed / page left): not a failure.
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    console.error("breakdowns: GA4 report failed:", err);
    const status = err instanceof Ga4Error && err.status === 429 ? 429 : 502;
    return NextResponse.json({ error: ga4FailureMessage(err) }, { status });
  }
}
