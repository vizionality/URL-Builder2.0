// GA4 report specs for the extra dashboard widgets, and how each report's rows
// become the widget's data. Pure (no fetching), so it's unit-tested; the
// /api/ga4/widgets route runs the reports.

import type { RawRow } from "@/lib/ga4-api";

export type Range = { startDate: string; endDate: string };
export type Ctx = { current: Range[]; withPrev: Range[]; keyMetric: string; filter: Record<string, unknown> };

// A scorecard: value and previous-period value.
export type ScoreData = { kind: "score"; value: number; prev: number; format: "number" | "percent" | "decimal" };
// A ranked list for a pie or bar.
export type ListData = { kind: "list"; rows: { label: string; value: number }[] };
// A table with named columns.
export type TableData = { kind: "table"; columns: string[]; rows: { label: string; values: number[] }[] };
export type WidgetData = ScoreData | ListData | TableData;

type Spec = { body: (c: Ctx) => unknown; parse: (rows: RawRow[]) => WidgetData };

const dv = (r: RawRow, i = 0) => r.dimensionValues?.[i]?.value ?? "";
const mv = (r: RawRow, i = 0) => Number(r.metricValues?.[i]?.value ?? 0);

// Two date ranges -> GA4 appends a dateRange dimension; pick each range's row.
function score(metric: (c: Ctx) => string, format: ScoreData["format"], scale = 1): Spec {
  return {
    body: (c) => ({ dateRanges: c.withPrev, metrics: [{ name: metric(c) }], ...c.filter }),
    parse: (rows) => {
      const at = (range: string) => rows.find((r) => r.dimensionValues?.some((d) => d.value === range));
      const cur = at("date_range_0");
      const pre = at("date_range_1");
      return { kind: "score", value: (cur ? mv(cur) : 0) * scale, prev: (pre ? mv(pre) : 0) * scale, format };
    },
  };
}

function list(dimension: string, metric: string, limit: number, order: "value" | "label" = "value"): Spec {
  return {
    body: (c) => ({
      dateRanges: c.current,
      dimensions: [{ name: dimension }],
      metrics: [{ name: metric }],
      ...(order === "value" ? { orderBys: [{ desc: true, metric: { metricName: metric } }] } : {}),
      limit,
      ...c.filter,
    }),
    parse: (rows) => {
      const out = rows
        .map((r) => ({ label: dv(r) || "(not set)", value: mv(r) }))
        .filter((x) => x.value > 0);
      if (order === "label") out.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
      return { kind: "list", rows: out };
    },
  };
}

function table(dimension: string, columns: { label: string; metric: (c: Ctx) => string }[], limit: number): Spec {
  return {
    body: (c) => ({
      dateRanges: c.current,
      dimensions: [{ name: dimension }],
      metrics: columns.map((col) => ({ name: col.metric(c) })),
      orderBys: [{ desc: true, metric: { metricName: columns[0].metric(c) } }],
      limit,
      ...c.filter,
    }),
    parse: (rows) => ({
      kind: "table",
      columns: columns.map((col) => col.label),
      rows: rows.map((r) => ({ label: dv(r) || "(not set)", values: columns.map((_, i) => mv(r, i)) })),
    }),
  };
}

const name = (n: string) => () => n;

export const EXTRA_SPECS: Record<string, Spec> = {
  "sc.bounceRate": score(name("bounceRate"), "percent", 100),
  "sc.pagesPerSession": score(name("screenPageViewsPerSession"), "decimal"),
  "sc.engagedSessions": score(name("engagedSessions"), "number"),
  "sc.eventCount": score(name("eventCount"), "number"),
  "sc.keyEvents": score((c) => c.keyMetric, "number"),
  device: list("deviceCategory", "sessions", 10),
  newVsReturning: list("newVsReturning", "totalUsers", 5),
  browser: list("browser", "sessions", 8),
  countries: list("country", "sessions", 10),
  cities: list("city", "sessions", 10),
  hourOfDay: list("hour", "sessions", 24, "label"),
  pageTitles: table(
    "pageTitle",
    [
      { label: "Views", metric: name("screenPageViews") },
      { label: "Users", metric: name("totalUsers") },
      { label: "Avg engagement (s)", metric: name("userEngagementDuration") },
    ],
    100
  ),
  campaigns: table(
    "sessionCampaignName",
    [
      { label: "Sessions", metric: name("sessions") },
      { label: "Engaged sessions", metric: name("engagedSessions") },
      { label: "Key events", metric: (c) => c.keyMetric },
    ],
    100
  ),
};

// Engagement time per user: GA4 gives the total seconds, so divide by users.
export function finishPageTitles(d: TableData): TableData {
  return {
    ...d,
    rows: d.rows.map((r) => ({
      ...r,
      values: [r.values[0], r.values[1], r.values[1] > 0 ? Math.round(r.values[2] / r.values[1]) : 0],
    })),
  };
}
