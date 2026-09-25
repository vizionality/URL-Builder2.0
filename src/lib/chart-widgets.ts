// Chart-type widgets: every metric as a number or over time, and every
// breakdown as a donut, pie, horizontal bar or table, plus US and world maps.
// Widget ids are "c.<chart>.<subject>" (subject = a metric or dimension id).
// Pure: the catalog, id parsing, and GA4 report specs (run by /api/ga4/widgets).

import type { RawRow } from "@/lib/ga4-api";
import type { ListData, Range, ScoreData, TableData } from "@/lib/extra-widgets";
import { bucketRanges, type TimeGrain } from "@/lib/report";

export type ChartType =
  | "number" | "line" | "area" | "bar" | "donut" | "pie" | "map" | "stacked" | "hbar" | "table";

export const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: "number", label: "Number" },
  { id: "line", label: "Line" },
  { id: "area", label: "Area" },
  { id: "bar", label: "Bar (over time)" },
  { id: "donut", label: "Donut" },
  { id: "pie", label: "Pie" },
  { id: "map", label: "Map" },
  { id: "stacked", label: "Stacked area" },
  { id: "hbar", label: "Horizontal bar" },
  { id: "table", label: "Table" },
];

export type MetricFormat = "number" | "percent" | "decimal" | "duration";
export type ChartMetric = { id: string; ga: string; label: string; format: MetricFormat; scale?: number };

// keyEvents resolves to the property's own metric name on the server.
export const CHART_METRICS: ChartMetric[] = [
  { id: "sessions", ga: "sessions", label: "Sessions", format: "number" },
  { id: "totalUsers", ga: "totalUsers", label: "Total users", format: "number" },
  { id: "newUsers", ga: "newUsers", label: "New users", format: "number" },
  { id: "engagedSessions", ga: "engagedSessions", label: "Engaged sessions", format: "number" },
  { id: "engagementRate", ga: "engagementRate", label: "Engagement rate", format: "percent", scale: 100 },
  { id: "bounceRate", ga: "bounceRate", label: "Bounce rate", format: "percent", scale: 100 },
  { id: "views", ga: "screenPageViews", label: "Views", format: "number" },
  { id: "viewsPerSession", ga: "screenPageViewsPerSession", label: "Views per session", format: "decimal" },
  { id: "avgDuration", ga: "averageSessionDuration", label: "Avg session duration", format: "duration" },
  { id: "keyEvents", ga: "keyEvents", label: "Key events", format: "number" },
  { id: "eventCount", ga: "eventCount", label: "Event count", format: "number" },
];
export const METRIC_BY_ID = new Map(CHART_METRICS.map((m) => [m.id, m]));

export type ChartDimension = { id: string; ga: string; label: string; area: "Acquisition" | "Traffic" | "Geography" };
export const CHART_DIMENSIONS: ChartDimension[] = [
  { id: "channel", ga: "sessionDefaultChannelGroup", label: "Channel group", area: "Acquisition" },
  { id: "source", ga: "sessionSource", label: "Source", area: "Acquisition" },
  { id: "medium", ga: "sessionMedium", label: "Medium", area: "Acquisition" },
  { id: "campaign", ga: "sessionCampaignName", label: "Campaign", area: "Acquisition" },
  { id: "device", ga: "deviceCategory", label: "Device", area: "Traffic" },
  { id: "browser", ga: "browser", label: "Browser", area: "Traffic" },
  { id: "landingPage", ga: "landingPage", label: "Landing page", area: "Traffic" },
  { id: "country", ga: "country", label: "Country", area: "Geography" },
  { id: "region", ga: "region", label: "State / region", area: "Geography" },
  { id: "city", ga: "city", label: "City", area: "Geography" },
];
export const DIMENSION_BY_ID = new Map(CHART_DIMENSIONS.map((d) => [d.id, d]));

const TIME_CHARTS: ChartType[] = ["line", "area", "bar", "stacked"];
export const TIME_CHART_TYPES = TIME_CHARTS;
const BREAKDOWN_CHARTS: ChartType[] = ["donut", "pie", "hbar", "table"];
// Breakdown charts whose card has a metric dropdown (a table shows several metrics).
export const METRIC_PICK_CHARTS: ChartType[] = ["donut", "pie", "hbar", "map"];

export type ChartWidgetDef = {
  id: string;
  title: string;
  description: string;
  category: "Summary" | "Traffic" | "Acquisition" | "Geography";
  size: "scorecard" | "third" | "half" | "full";
  chart: ChartType;
  subject: string;
};

const CHART_WORD: Record<ChartType, string> = {
  number: "number", line: "line", area: "area", bar: "bars", donut: "donut", pie: "pie",
  map: "map", stacked: "stacked area", hbar: "bars", table: "table",
};

function build(): ChartWidgetDef[] {
  const out: ChartWidgetDef[] = [];
  for (const m of CHART_METRICS) {
    out.push({
      id: `c.number.${m.id}`, title: m.label, description: "Number with % change.",
      category: "Summary", size: "scorecard", chart: "number", subject: m.id,
    });
    for (const chart of TIME_CHARTS) {
      out.push({
        id: `c.${chart}.${m.id}`,
        title: `${m.label} over time`,
        description: chart === "stacked" ? "Daily, stacked by channel group." : `Daily, as ${CHART_WORD[chart]}.`,
        category: "Traffic", size: "half", chart, subject: m.id,
      });
    }
  }
  for (const d of CHART_DIMENSIONS) {
    for (const chart of BREAKDOWN_CHARTS) {
      out.push({
        id: `c.${chart}.${d.id}`,
        title: `${d.label}${chart === "table" ? " table" : ""}`,
        description: chart === "table" ? "Sessions, users, engagement and key events." : `Top values as ${CHART_WORD[chart]}; metric switchable.`,
        category: d.area, size: chart === "table" ? "full" : "third", chart, subject: d.id,
      });
    }
  }
  out.push(
    { id: "c.map.world", title: "World map", description: "Countries shaded by a chosen metric.", category: "Geography", size: "half", chart: "map", subject: "world" },
  );
  return out;
}

export const CHART_WIDGETS: ChartWidgetDef[] = build();
export const CHART_WIDGET_BY_ID = new Map(CHART_WIDGETS.map((w) => [w.id, w]));

// Chart types the existing (hand-built) widgets appear under in the sidebar.
export const EXISTING_WIDGET_CHARTS: Record<string, ChartType> = {
  "sc.views": "number", "sc.totalUsers": "number", "sc.newUsers": "number", "sc.sessions": "number",
  "sc.engagementRate": "number", "sc.avgSessionDuration": "number", "sc.generateLead": "number",
  "sc.bounceRate": "number", "sc.pagesPerSession": "number", "sc.engagedSessions": "number",
  "sc.eventCount": "number", "sc.keyEvents": "number",
  monthly: "bar", channel: "pie", states: "hbar", geo: "map",
  sources: "table", pages: "table", conversions: "table",
  "sources.table": "table", "pages.table": "table", "conversions.table": "table",
  "sources.trend": "line", "pages.trend": "line", "conversions.trend": "bar", pageTitles: "table", campaigns: "table",
  device: "pie", newVsReturning: "pie", browser: "hbar", countries: "hbar", cities: "hbar", hourOfDay: "bar",
};

export function isChartWidget(id: string): boolean {
  return CHART_WIDGET_BY_ID.has(id);
}

// ---- Reports -------------------------------------------------------------------

// `grain` is what each row's date stands for (a day, or the start of a week /
// month / quarter).
export type SeriesData = { kind: "series"; format: MetricFormat; grain?: TimeGrain; rows: { date: string; value: number }[] };
export type StackData = {
  kind: "stack";
  format: MetricFormat;
  grain?: TimeGrain;
  series: string[];
  rows: Record<string, number | string>[]; // { date, s0, s1, ... }
};
export type ChartData = ScoreData | ListData | TableData | SeriesData | StackData;

export type ChartCtx = { current: Range[]; withPrev: Range[]; keyMetric: string; filter: Record<string, unknown> };

const dv = (r: RawRow, i = 0) => r.dimensionValues?.[i]?.value ?? "";
const mv = (r: RawRow, i = 0) => Number(r.metricValues?.[i]?.value ?? 0);
const isoDate = (yyyymmdd: string) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

function gaName(m: ChartMetric, ctx: ChartCtx): string {
  return m.id === "keyEvents" ? ctx.keyMetric : m.ga;
}

const STACK_SERIES = 5;

// The GA4 report for a chart widget, and how its rows become the chart's data.
// `metricId` is the card's chosen metric for donut / pie / bars / map.
export function chartSpec(
  id: string,
  metricId: string | null,
  ctx: ChartCtx
): { body: unknown; parse: (rows: RawRow[]) => ChartData } | null {
  const def = CHART_WIDGET_BY_ID.get(id);
  if (!def) return null;
  const { chart, subject } = def;

  if (chart === "number" || TIME_CHARTS.includes(chart)) {
    const m = METRIC_BY_ID.get(subject);
    if (!m) return null;
    const scale = m.scale ?? 1;
    if (chart === "number") {
      return {
        body: { dateRanges: ctx.withPrev, metrics: [{ name: gaName(m, ctx) }], ...ctx.filter },
        parse: (rows) => {
          const at = (range: string) => rows.find((r) => r.dimensionValues?.some((d) => d.value === range));
          const cur = at("date_range_0");
          const pre = at("date_range_1");
          return { kind: "score", value: (cur ? mv(cur) : 0) * scale, prev: (pre ? mv(pre) : 0) * scale, format: m.format };
        },
      };
    }
    if (chart === "stacked") {
      return {
        body: {
          dateRanges: ctx.current,
          dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }],
          metrics: [{ name: gaName(m, ctx) }],
          limit: 10000,
          ...ctx.filter,
        },
        parse: (rows) => {
          // Top channels by total; the rest are folded into "Other".
          const totals = new Map<string, number>();
          for (const r of rows) totals.set(dv(r, 1), (totals.get(dv(r, 1)) ?? 0) + mv(r));
          const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, STACK_SERIES).map(([k]) => k);
          const series = totals.size > top.length ? [...top, "Other"] : top;
          const byDate = new Map<string, Record<string, number | string>>();
          for (const r of rows) {
            const date = isoDate(dv(r, 0));
            const row = byDate.get(date) ?? Object.fromEntries([["date", date], ...series.map((_, i) => [`s${i}`, 0])]);
            const i = top.indexOf(dv(r, 1));
            const key = `s${i >= 0 ? i : series.length - 1}`;
            row[key] = Number(row[key]) + mv(r) * scale;
            byDate.set(date, row);
          }
          const out = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
          return { kind: "stack", format: m.format, series, rows: out };
        },
      };
    }
    return {
      body: {
        dateRanges: ctx.current,
        dimensions: [{ name: "date" }],
        metrics: [{ name: gaName(m, ctx) }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 1000,
        ...ctx.filter,
      },
      parse: (rows) => ({
        kind: "series",
        format: m.format,
        rows: rows.map((r) => ({ date: isoDate(dv(r)), value: mv(r) * scale })),
      }),
    };
  }

  if (chart === "table") {
    const d = DIMENSION_BY_ID.get(subject);
    if (!d) return null;
    return {
      body: {
        dateRanges: ctx.current,
        dimensions: [{ name: d.ga }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagementRate" }, { name: ctx.keyMetric }],
        orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
        limit: 100,
        ...ctx.filter,
      },
      parse: (rows) => ({
        kind: "table",
        columns: ["Sessions", "Users", "Engagement %", "Key events"],
        rows: rows.map((r) => ({
          label: dv(r) || "(not set)",
          values: [mv(r, 0), mv(r, 1), Math.round(mv(r, 2) * 1000) / 10, mv(r, 3)],
        })),
      }),
    };
  }

  // Donut / pie / bars / map: one dimension by the card's chosen metric.
  const m = METRIC_BY_ID.get(metricId ?? "") ?? METRIC_BY_ID.get("sessions")!;
  const dimension = chart === "map" ? DIMENSION_BY_ID.get("country")! : DIMENSION_BY_ID.get(subject);
  if (!dimension) return null;
  const scale = m.scale ?? 1;
  return {
    body: {
      dateRanges: ctx.current,
      dimensions: [{ name: dimension.ga }],
      metrics: [{ name: gaName(m, ctx) }],
      orderBys: [{ desc: true, metric: { metricName: gaName(m, ctx) } }],
      limit: chart === "map" ? 250 : chart === "hbar" ? 10 : 8,
      ...ctx.filter,
    },
    parse: (rows) => ({
      kind: "list",
      rows: rows
        .map((r) => ({ label: dv(r) || "(not set)", value: mv(r) * scale }))
        .filter((x) => x.value > 0),
    }),
  };
}

// Countries whose states / provinces the world map can shade and drill into
// (bundled shapes: us-atlas for the US, Natural Earth for Canada).
export const SUBDIVIDED_COUNTRIES = ["United States", "Canada"] as const;

// World map extra: the chosen metric by US state and Canadian province, so the
// North America view can shade and drill into them.
export function subdivisionsSpec(
  metricId: string | null,
  ctx: ChartCtx
): { body: unknown; parse: (rows: RawRow[]) => { country: string; label: string; value: number }[] } {
  const m = METRIC_BY_ID.get(metricId ?? "") ?? METRIC_BY_ID.get("sessions")!;
  const scale = m.scale ?? 1;
  const filter = ctx.filter as { dimensionFilter?: unknown };
  const countries = { filter: { fieldName: "country", inListFilter: { values: [...SUBDIVIDED_COUNTRIES] } } };
  // AND the countries clause onto the page's filters (if any).
  const dimensionFilter = filter.dimensionFilter
    ? { andGroup: { expressions: [filter.dimensionFilter, countries] } }
    : countries;
  return {
    body: {
      dateRanges: ctx.current,
      dimensions: [{ name: "country" }, { name: "region" }],
      metrics: [{ name: gaName(m, ctx) }],
      limit: 200,
      dimensionFilter,
    },
    parse: (rows) =>
      rows
        .map((r) => ({ country: dv(r, 0), label: dv(r, 1), value: mv(r) * scale }))
        .filter((x) => x.label && !x.label.startsWith("(") && x.value > 0),
  };
}

// Request ids carry the card's choices: "c.donut.channel~keyEvents" (metric),
// "c.line.sessions@week" (time grain).
export function splitRequestId(requestId: string): { id: string; metric: string | null; grain: TimeGrain } {
  const [head, rawGrain] = requestId.split("@");
  const [id, metric] = head.split("~");
  const grain = (["week", "month", "quarter"] as const).find((g) => g === rawGrain) ?? "day";
  return { id, metric: metric && METRIC_BY_ID.has(metric) ? metric : null, grain };
}

export function isTimeChart(id: string): boolean {
  const def = CHART_WIDGET_BY_ID.get(id);
  return Boolean(def && TIME_CHARTS.includes(def.chart));
}

// A time chart by week / month / quarter: one GA4 date range per bucket (at
// most 4 per report), so every metric is right for its bucket, users and
// rates included (they can't be summed from days).
export function bucketedTimeSpec(
  id: string,
  grain: Exclude<TimeGrain, "day">,
  ctx: ChartCtx
): { bodies: unknown[]; parse: (reports: RawRow[][]) => ChartData } | null {
  const def = CHART_WIDGET_BY_ID.get(id);
  const m = def && METRIC_BY_ID.get(def.subject);
  if (!def || !m || !TIME_CHARTS.includes(def.chart)) return null;
  const { startDate, endDate } = ctx.current[0];
  const buckets = bucketRanges(startDate, endDate, grain);
  const scale = m.scale ?? 1;
  const stacked = def.chart === "stacked";
  const bodies: unknown[] = [];
  for (let i = 0; i < buckets.length; i += 4) {
    bodies.push({
      dateRanges: buckets.slice(i, i + 4).map(({ startDate: s, endDate: e }) => ({ startDate: s, endDate: e })),
      ...(stacked ? { dimensions: [{ name: "sessionDefaultChannelGroup" }] } : {}),
      metrics: [{ name: gaName(m, ctx) }],
      limit: 10000,
      ...ctx.filter,
    });
  }
  // The bucket a row belongs to: GA4 appends "date_range_N" (N within its report).
  const rowsWithBucket = (reports: RawRow[][]) =>
    reports.flatMap((rows, r) =>
      rows.map((row) => {
        const range = row.dimensionValues?.[row.dimensionValues.length - 1]?.value ?? "";
        const bucket = buckets[r * 4 + Number(range.replace("date_range_", ""))];
        return { row, key: bucket?.key };
      })
    ).filter((x): x is { row: RawRow; key: string } => Boolean(x.key));

  if (!stacked) {
    return {
      bodies,
      parse: (reports) => {
        const byKey = new Map(rowsWithBucket(reports).map(({ row, key }) => [key, mv(row) * scale]));
        return {
          kind: "series",
          format: m.format,
          grain,
          rows: buckets.map((b) => ({ date: b.key, value: byKey.get(b.key) ?? 0 })),
        };
      },
    };
  }
  return {
    bodies,
    parse: (reports) => {
      const all = rowsWithBucket(reports);
      const totals = new Map<string, number>();
      for (const { row } of all) totals.set(dv(row, 0), (totals.get(dv(row, 0)) ?? 0) + mv(row));
      const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, STACK_SERIES).map(([k]) => k);
      const series = totals.size > top.length ? [...top, "Other"] : top;
      const byKey = new Map(
        buckets.map((b) => [b.key, Object.fromEntries([["date", b.key], ...series.map((_, i) => [`s${i}`, 0])])])
      );
      for (const { row, key } of all) {
        const out = byKey.get(key)!;
        const i = top.indexOf(dv(row, 0));
        const k = `s${i >= 0 ? i : series.length - 1}`;
        out[k] = Number(out[k]) + mv(row) * scale;
      }
      return { kind: "stack", format: m.format, grain, series, rows: [...byKey.values()] };
    },
  };
}

// GA4 country names that differ from the world-atlas shape names.
export const COUNTRY_ALIASES: Record<string, string> = {
  "United States": "United States of America",
  "Türkiye": "Turkey",
  "Czech Republic": "Czechia",
  "Dominican Republic": "Dominican Rep.",
  "Bosnia & Herzegovina": "Bosnia and Herz.",
  "Democratic Republic of the Congo": "Dem. Rep. Congo",
  "Congo - Kinshasa": "Dem. Rep. Congo",
  "Congo - Brazzaville": "Congo",
  "Central African Republic": "Central African Rep.",
  "South Sudan": "S. Sudan",
  "Myanmar (Burma)": "Myanmar",
  "Côte d’Ivoire": "Côte d'Ivoire",
  "Equatorial Guinea": "Eq. Guinea",
  "North Macedonia": "Macedonia",
  "Eswatini": "eSwatini",
  "Solomon Islands": "Solomon Is.",
  "Falkland Islands (Islas Malvinas)": "Falkland Is.",
  "Western Sahara": "W. Sahara",
};
