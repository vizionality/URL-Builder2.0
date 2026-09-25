import { pageFilterExpr, parsePageFilters } from "@/lib/ga4-filters";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { parseGa4Date } from "@/lib/indicators/dates";
import { bucketRanges, comparisonRange, parseBreakdownMetric, pivotDaily, type TimeGrain } from "@/lib/report";
import { batchRunReports, currentKeyEvents, detectKeyMetric, ga4FailureMessage, Ga4Error, type RawRow } from "@/lib/ga4-api";

// Top Traffic Sources, Landing Pages, and Conversions for the Dashboard: each a
// table plus a daily trend for its top items. Same filters and date range as
// /api/ga4/overview. Per-user OAuth, computed on read.

const TOP_SOURCES = 10;
const TREND_SOURCES = 5;
// Landing pages fetched for the paginated table (the trend uses the top few).
const MAX_PAGES = 500;
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
  // Tables the page's layout shows (sources, pages, conversions); absent means all.
  const partsParam = url.searchParams.get("parts");
  const parts = new Set(partsParam == null ? ["sources", "pages", "conversions"] : partsParam.split(","));
  // What Top Traffic Sources ranks and trends by (the dashboard's dropdown).
  const sourceMetric = parseBreakdownMetric(url.searchParams.get("sourceMetric"), "totalUsers");
  // Grain of the sources trend. Only needed server-side for total users, which
  // can't be summed from days (a user active on two days is one user); every
  // other trend is summed from daily rows in the browser.
  const grainParam = url.searchParams.get("sourceGrain");
  const sourceGrain: TimeGrain =
    grainParam === "week" || grainParam === "month" || grainParam === "quarter" ? grainParam : "day";
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
    const [keyMetric, markedKeyEvents] = await Promise.all([
      detectKeyMetric(propertyId, token, request.signal),
      currentKeyEvents(propertyId, token, request.signal),
    ]);
    const srcMetric = sourceMetric === "keyEvents" ? keyMetric : sourceMetric;

    // Wave 1: the tables on the page, in one batch call (and which items to trend).
    const wave1: [string, unknown][] = [];
    if (parts.has("sources")) wave1.push(["src",
      {
        dateRanges: both,
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
        metrics: [{ name: srcMetric }],
        // Ordered so that if a large property hits the row limit, only the
        // smallest source/medium rows are dropped.
        orderBys: [{ desc: true, metric: { metricName: srcMetric } }],
        limit: 1000,
        ...pageFilterExpr(filters),
      }
    ]);
    if (parts.has("pages")) wave1.push(["page",
      {
        dateRanges: cur,
        dimensions: [{ name: "landingPage" }],
        metrics: [{ name: "sessions" }, { name: "engagementRate" }],
        orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
        limit: MAX_PAGES,
        ...pageFilterExpr(filters),
      }
    ]);
    if (parts.has("conversions")) wave1.push(["conv",
      {
        dateRanges: both,
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: keyMetric }],
        limit: 200,
        ...pageFilterExpr(filters),
      }
    ]);
    const wave1Rows = await batchRunReports(propertyId, token, wave1.map(([, b]) => b), request.signal);
    const wave1Got = (key: string): RawRow[] => wave1Rows[wave1.findIndex(([k]) => k === key)] ?? [];
    const [srcRows, pageRows, convRows] = ["src", "page", "conv"].map(wave1Got);

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
    // Every pair with a value, for the paginated table; the trend uses the top ones.
    const sources = allSources.filter((s) => s.users > 0);
    const sourceTotal = {
      users: allSources.reduce((sum, s) => sum + s.users, 0),
      prev: allSources.reduce((sum, s) => sum + s.prev, 0),
    };
    // Trend the top distinct source names (a source can appear under two mediums).
    const trendSources = [...new Set(sources.slice(0, TOP_SOURCES).map((s) => s.source))].slice(0, TREND_SOURCES);

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
      // Only events marked as key events in GA4 today (e.g. drops a page_view
      // that was marked for part of the range). Unfiltered if GA4 Admin
      // couldn't be read.
      .filter((c) => !markedKeyEvents || markedKeyEvents.has(c.event))
      .sort((a, b) => b.count - a.count);
    const trendEvents = conversions.filter((c) => c.count > 0).map((c) => c.event).slice(0, TREND_EVENTS);

    // Wave 2: daily trends for the top items, in one batch call. A trend with
    // nothing to show is left out rather than sent as an empty report.
    const trendReports: { key: "src" | "srcBucket" | "page" | "conv"; body: unknown; offset?: number }[] = [];
    // Total users per week/month/quarter: one GA4 date range per bucket (at
    // most 4 per report), so each bucket's users are counted once.
    const srcBuckets =
      srcMetric === "totalUsers" && sourceGrain !== "day" ? bucketRanges(start, end, sourceGrain) : null;
    if (trendSources.length && srcBuckets) {
      for (let i = 0; i < srcBuckets.length; i += 4) {
        trendReports.push({ key: "srcBucket", offset: i, body: {
          dateRanges: srcBuckets.slice(i, i + 4).map(({ startDate, endDate }) => ({ startDate, endDate })),
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: srcMetric }],
          limit: 10000,
          ...pageFilterExpr(filters, [inList("sessionSource", trendSources)]),
        } });
      }
    } else if (trendSources.length) {
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
    const rowsFor = (key: "src" | "srcBucket" | "page" | "conv"): RawRow[] =>
      trendRows[trendReports.findIndex((t) => t.key === key)] ?? [];
    const srcTrendRows = rowsFor("src");
    const pageTrendRows = rowsFor("page");
    const convTrendRows = rowsFor("conv");

    const long = (rows: RawRow[]) =>
      rows.map((r) => ({ date: parseGa4Date(dv(r, 0)), series: dv(r, 1), value: mv(r) }));

    // Bucketed rows carry the range as the last dimension ("date_range_N",
    // N counting within that report); map it back to the bucket's start date.
    const srcBucketLong: { date: string; series: string; value: number }[] = [];
    if (srcBuckets) {
      trendReports.forEach((t, idx) => {
        if (t.key !== "srcBucket") return;
        for (const r of trendRows[idx] ?? []) {
          const n = Number(dv(r, 1).replace("date_range_", ""));
          const bucket = srcBuckets[(t.offset ?? 0) + n];
          if (bucket) srcBucketLong.push({ date: bucket.key, series: dv(r, 0), value: mv(r) });
        }
      });
    }

    // Conversions trend: only days with any events, like the Looker grouped bars.
    const convTrend = pivotDaily(long(convTrendRows), trendEvents);
    convTrend.data = convTrend.data.filter((row) =>
      convTrend.series.some((s) => Number(row[s.key]) > 0)
    );

    return NextResponse.json({
      sources,
      sourceTotal,
      sourceCount: allSources.filter((s) => s.users > 0).length,
      sourceTrend: pivotDaily(srcBuckets ? srcBucketLong : long(srcTrendRows), trendSources),
      // "day" means daily rows the browser may roll up; otherwise already bucketed.
      sourceTrendGrain: srcBuckets ? sourceGrain : "day",
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
