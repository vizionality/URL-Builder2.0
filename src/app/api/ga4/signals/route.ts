import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { runIndicators, type RunInput } from "@/lib/indicators";
import type { MetricKind, Point, RateSample, Signal } from "@/lib/indicators/types";
import { parseGa4Date, addDays } from "@/lib/indicators/dates";
import { persistSignals, loadSignals } from "@/lib/indicators/store";

const DATA_API = "https://analyticsdata.googleapis.com/v1beta";

// How many days of history to pull. The engine needs at least 56 days for
// seasonal factors; 400 gives room for slow moving averages and long baselines
// while staying inside GA4's standard retention.
const LOOKBACK_DAYS = 400;

// Metrics the UI can request. Cost-based metrics are intentionally absent: the
// Google Ads dev token is pending, so the UI shows them disabled-with-reason
// rather than the route pretending to support them.
const METRICS = {
  sessions: { kind: "count" as MetricKind, label: "Sessions" },
  conversions: { kind: "count" as MetricKind, label: "Conversions" },
  conversionRate: { kind: "rate" as MetricKind, label: "Conversion rate" },
} as const;

type MetricId = keyof typeof METRICS;

function isMetricId(value: string): value is MetricId {
  return value in METRICS;
}

// Optional deep-link filter: chart one dimension value (a campaign, source,
// medium, or landing page) instead of the whole property. Mirrors the screener.
const DIMENSIONS = {
  campaign: "sessionCampaignName",
  source: "sessionSource",
  medium: "sessionMedium",
  landingPage: "landingPage",
} as const;
type DimensionId = keyof typeof DIMENSIONS;

function isDimensionId(value: string): value is DimensionId {
  return value in DIMENSIONS;
}

// A GA4 dimensionFilter clause for one exact value, or {} when unfiltered.
function dimensionFilter(dimension: DimensionId | null, value: string) {
  if (!dimension || !value) return {};
  return {
    dimensionFilter: {
      filter: {
        fieldName: DIMENSIONS[dimension],
        stringFilter: { value, matchType: "EXACT" },
      },
    },
  };
}

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type RawRow = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };

// Pull a short, human-readable reason out of a thrown GA4 error. runReport
// throws `GA4 runReport <status>: <body>`, where the body is GA4's JSON error
// envelope; surface its status + message so a failure is diagnosable from the
// UI instead of a generic "try again".
function ga4Reason(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const m = /GA4 runReport (\d+): ([\s\S]*)/.exec(msg);
  if (!m) return msg.slice(0, 200);
  const status = m[1];
  let detail = m[2];
  try {
    const parsed = JSON.parse(m[2]);
    detail = parsed?.error?.message ?? detail;
  } catch {
    // body was not JSON; keep the raw text
  }
  return `${status} ${detail}`.slice(0, 240);
}

async function runReport(
  propertyId: string,
  token: string,
  body: unknown
): Promise<RawRow[]> {
  const res = await fetch(`${DATA_API}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GA4 runReport ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.rows ?? []) as RawRow[];
}

// GA4 renamed `conversions` to `keyEvents`; probe which the property accepts.
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

// Fill every day in [start, end] so the engine sees a dense series (GA4 omits
// zero-traffic days). Missing days become value 0 / zero samples.
function densify(
  start: string,
  end: string,
  byDate: Map<string, { value: number; successes: number; trials: number }>
): { series: Point[]; samples: RateSample[] } {
  const series: Point[] = [];
  const samples: RateSample[] = [];
  let d = start;
  while (d <= end) {
    const hit = byDate.get(d) ?? { value: 0, successes: 0, trials: 0 };
    series.push({ date: d, value: hit.value });
    samples.push({ date: d, successes: hit.successes, trials: hit.trials });
    d = addDays(d, 1);
  }
  return { series, samples };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const metricParam = url.searchParams.get("metric") ?? "sessions";
  if (!isMetricId(metricParam)) {
    return NextResponse.json(
      { error: `Unknown metric "${metricParam}".` },
      { status: 400 }
    );
  }
  const metric = metricParam;

  const dimParam = url.searchParams.get("dimension");
  const filterValue = url.searchParams.get("value") ?? "";
  const dimension = dimParam && isDimensionId(dimParam) ? dimParam : null;
  const isFiltered = Boolean(dimension && filterValue);
  const dimFilter = dimensionFilter(dimension, filterValue);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const conn = await getGa4Connection(user.id);
  if (!conn) {
    return NextResponse.json(
      { error: "Google Analytics is not connected." },
      { status: 501 }
    );
  }
  if (!conn.property_id) {
    return NextResponse.json({ error: "No GA4 property selected." }, { status: 400 });
  }
  const propertyId = conn.property_id;

  let token: string;
  try {
    token = await getAccessToken(conn.refresh_token);
  } catch (err) {
    console.error("GA4 token refresh failed:", err);
    return NextResponse.json(
      { error: "Google auth expired. Reconnect Google Analytics." },
      { status: 401 }
    );
  }

  const end = todayUtcIso();
  const start = addDays(end, -(LOOKBACK_DAYS - 1));
  // GA4 dateRanges want ISO "YYYY-MM-DD" (the `date` dimension in responses is
  // "yyyymmdd", but the request side is not); pass the ISO dates directly.
  const dateRanges = [{ startDate: start, endDate: end }];

  const keyMetric =
    metric === "sessions" ? "sessions" : await detectKeyMetric(propertyId, token);

  // Assemble the day-keyed data for the requested metric.
  const byDate = new Map<string, { value: number; successes: number; trials: number }>();
  try {
    if (metric === "sessions") {
      const rows = await runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        ...dimFilter,
      });
      for (const r of rows) {
        const date = parseGa4Date(r.dimensionValues?.[0]?.value ?? "");
        const v = Number(r.metricValues?.[0]?.value ?? 0);
        byDate.set(date, { value: v, successes: 0, trials: 0 });
      }
    } else if (metric === "conversions") {
      const rows = await runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [{ name: keyMetric }],
        ...dimFilter,
      });
      for (const r of rows) {
        const date = parseGa4Date(r.dimensionValues?.[0]?.value ?? "");
        const v = Number(r.metricValues?.[0]?.value ?? 0);
        byDate.set(date, { value: v, successes: 0, trials: 0 });
      }
    } else {
      // conversionRate = keyEvents / sessions, per day.
      const rows = await runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: "date" }],
        metrics: [{ name: keyMetric }, { name: "sessions" }],
        ...dimFilter,
      });
      for (const r of rows) {
        const date = parseGa4Date(r.dimensionValues?.[0]?.value ?? "");
        const successes = Number(r.metricValues?.[0]?.value ?? 0);
        const trials = Number(r.metricValues?.[1]?.value ?? 0);
        const value = trials > 0 ? successes / trials : 0;
        byDate.set(date, { value, successes, trials });
      }
    }
  } catch (err) {
    console.error("signals: GA4 report failed:", err);
    return NextResponse.json(
      { error: `GA4 report failed: ${ga4Reason(err)}` },
      { status: 502 }
    );
  }

  const kind = METRICS[metric].kind;
  const { series, samples } = densify(start, end, byDate);
  const input: RunInput = { metric, kind, series };
  if (kind === "rate") input.rateSamples = samples;
  const payload = runIndicators(input);

  const filterInfo = isFiltered ? { dimension, value: filterValue } : null;

  // A filtered (deep-linked) view is compute-only: its signals are not persisted
  // or acknowledgeable, so they never pollute the property-wide signal history.
  if (isFiltered) {
    const provisionalFrom = payload.provisionalFromDate;
    return NextResponse.json({
      ...payload,
      signals: payload.signals.map((s) => ({
        ...s,
        provisional: Boolean(provisionalFrom && s.date >= provisionalFrom),
        acknowledgedAt: null,
      })),
      metricLabel: METRICS[metric].label,
      keyMetric,
      filter: filterInfo,
      ranAt: new Date().toISOString(),
    });
  }

  // Persist newly fired signals, then merge stored acknowledged status. A signal
  // on a provisional (still-restating) day is held back: it is not persisted and
  // is marked provisional so the UI can show it as tentative.
  const provisionalFrom = payload.provisionalFromDate;
  const settled = payload.signals.filter(
    (s) => !provisionalFrom || s.date < provisionalFrom
  );
  try {
    await persistSignals(user.id, propertyId, metric, settled);
    const stored = await loadSignals(user.id, propertyId, metric);
    const ackKey = (direction: string, firedOn: string) => `${direction}|${firedOn}`;
    const ackMap = new Map(
      stored.map((s) => [ackKey(s.direction, s.fired_on), s.acknowledged_at])
    );
    const signals = payload.signals.map((s: Signal) => ({
      ...s,
      provisional: Boolean(provisionalFrom && s.date >= provisionalFrom),
      acknowledgedAt: ackMap.get(ackKey(s.direction, s.date)) ?? null,
    }));
    return NextResponse.json({
      ...payload,
      signals,
      metricLabel: METRICS[metric].label,
      keyMetric,
      ranAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("signals: persistence failed:", err);
    // Still return the computed payload; acknowledgement just will not stick.
    return NextResponse.json({
      ...payload,
      signals: payload.signals.map((s) => ({ ...s, provisional: false, acknowledgedAt: null })),
      metricLabel: METRICS[metric].label,
      keyMetric,
      ranAt: new Date().toISOString(),
      notes: ["Signal history unavailable; acknowledgements will not persist."],
    });
  }
}
