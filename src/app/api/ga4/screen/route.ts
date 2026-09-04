import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { parseGa4Date, addDays } from "@/lib/indicators/dates";
import {
  screen,
  SCREEN_DEFAULTS,
  type ScreenCondition,
  type ScreenItem,
} from "@/lib/indicators/screen";
import type { Point } from "@/lib/indicators/types";

const DATA_API = "https://analyticsdata.googleapis.com/v1beta";
const LOOKBACK_DAYS = 400;
const TOP_N = 100; // cap values scanned per run to bound GA4 cost

// Dimension the UI can scan, mapped to its GA4 API name.
const DIMENSIONS = {
  campaign: "sessionCampaignName",
  source: "sessionSource",
  medium: "sessionMedium",
  landingPage: "landingPage",
} as const;
type DimensionId = keyof typeof DIMENSIONS;

const METRICS = { sessions: "sessions", conversions: "conversions" } as const;
type MetricId = keyof typeof METRICS;

function isDimension(v: string): v is DimensionId {
  return v in DIMENSIONS;
}
function isMetric(v: string): v is MetricId {
  return v in METRICS;
}
function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type RawRow = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };

async function runReport(propertyId: string, token: string, body: unknown): Promise<RawRow[]> {
  const res = await fetch(`${DATA_API}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 runReport ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.rows ?? []) as RawRow[];
}

async function detectKeyMetric(propertyId: string, token: string): Promise<string> {
  for (const name of ["keyEvents", "conversions"]) {
    try {
      const res = await fetch(`${DATA_API}/properties/${propertyId}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "yesterday" }],
          metrics: [{ name }],
        }),
      });
      if (res.ok) return name;
    } catch {
      // try next
    }
  }
  return "keyEvents";
}

function parseConditions(raw: string | null): ScreenCondition[] {
  if (!raw) return SCREEN_DEFAULTS.conditions;
  const all: ScreenCondition[] = ["cusum", "pctBaseline", "crossover"];
  const picked = raw.split(",").filter((c): c is ScreenCondition => all.includes(c as ScreenCondition));
  return picked.length ? picked : SCREEN_DEFAULTS.conditions;
}

function numParam(raw: string | null, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dimParam = url.searchParams.get("dimension") ?? "campaign";
  const metricParam = url.searchParams.get("metric") ?? "sessions";
  if (!isDimension(dimParam)) {
    return NextResponse.json({ error: `Unknown dimension "${dimParam}".` }, { status: 400 });
  }
  if (!isMetric(metricParam)) {
    return NextResponse.json({ error: `Unknown metric "${metricParam}".` }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const config = {
    conditions: parseConditions(url.searchParams.get("conditions")),
    withinDays: numParam(url.searchParams.get("withinDays"), SCREEN_DEFAULTS.withinDays),
    thresholdPct: numParam(url.searchParams.get("thresholdPct"), SCREEN_DEFAULTS.thresholdPct),
    withinBars: numParam(url.searchParams.get("withinBars"), SCREEN_DEFAULTS.withinBars),
    minVolume: numParam(url.searchParams.get("minVolume"), SCREEN_DEFAULTS.minVolume),
  };

  const end = todayUtcIso();
  const start = addDays(end, -(LOOKBACK_DAYS - 1));
  const dateRanges = [{ startDate: start, endDate: end }];
  const metricName =
    metricParam === "conversions" ? await detectKeyMetric(propertyId, token) : "sessions";

  let rows: RawRow[];
  try {
    rows = await runReport(propertyId, token, {
      dateRanges,
      dimensions: [{ name: "date" }, { name: DIMENSIONS[dimParam] }],
      metrics: [{ name: metricName }],
      limit: 200000,
    });
  } catch (err) {
    console.error("screen: GA4 report failed:", err);
    return NextResponse.json({ error: "GA4 report failed. Try again shortly." }, { status: 502 });
  }

  // Group into per-value daily maps plus a running total for ranking and floor.
  const byValue = new Map<string, { days: Map<string, number>; total: number }>();
  for (const r of rows) {
    const date = parseGa4Date(r.dimensionValues?.[0]?.value ?? "");
    const value = (r.dimensionValues?.[1]?.value ?? "").trim();
    if (!value || value.startsWith("(")) continue; // skip (not set) / (direct) etc.
    const n = Number(r.metricValues?.[0]?.value ?? 0);
    const entry = byValue.get(value) ?? { days: new Map(), total: 0 };
    entry.days.set(date, (entry.days.get(date) ?? 0) + n);
    entry.total += n;
    byValue.set(value, entry);
  }

  const totalValues = byValue.size;
  // Keep the top values by total metric to bound how many series we scan.
  const top = [...byValue.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, TOP_N);

  const items: ScreenItem[] = top.map(([value, entry]) => {
    const series: Point[] = [];
    let d = start;
    while (d <= end) {
      series.push({ date: d, value: entry.days.get(d) ?? 0 });
      d = addDays(d, 1);
    }
    return { value, series, total: entry.total };
  });

  const result = screen(items, config);

  return NextResponse.json({
    ...result,
    dimension: dimParam,
    metric: metricParam,
    metricName,
    totalValues,
    capped: totalValues > TOP_N,
    topN: TOP_N,
    range: { startDate: start, endDate: end },
    ranAt: new Date().toISOString(),
  });
}
