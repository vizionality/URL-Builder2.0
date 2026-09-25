import { describe, it, expect } from "vitest";
import { CHART_WIDGETS, chartSpec, splitRequestId, CHART_TYPES } from "@/lib/chart-widgets";
import { WIDGET_BY_ID, WIDGETS, DEFAULT_LAYOUT, extraParts, sanitizeLayout } from "@/lib/dashboard-widgets";

const ctx = {
  current: [{ startDate: "2026-01-01", endDate: "2026-01-31" }],
  withPrev: [{ startDate: "2026-01-01", endDate: "2026-01-31" }, { startDate: "2025-12-01", endDate: "2025-12-31" }],
  keyMetric: "conversions",
  filter: {},
};

describe("chart widgets", () => {
  it("every chart type has cards, all in the catalog and none on by default", () => {
    for (const t of CHART_TYPES) expect(WIDGETS.some((w) => w.chart === t.id)).toBe(true);
    for (const w of CHART_WIDGETS) {
      expect(WIDGET_BY_ID.get(w.id)?.generated).toBe(true);
      expect(DEFAULT_LAYOUT).not.toContain(w.id);
    }
    expect(new Set(CHART_WIDGETS.map((w) => w.id)).size).toBe(CHART_WIDGETS.length);
  });

  it("chart widgets survive layout sanitizing and are fetched as extras", () => {
    expect(sanitizeLayout(["c.line.sessions", "c.donut.channel|6", "c.nope.x"])).toEqual(["c.line.sessions", "c.donut.channel|6"]);
    expect(extraParts(["monthly", "c.line.sessions"])).toEqual(["c.line.sessions"]);
  });

  it("request ids carry a valid metric only", () => {
    expect(splitRequestId("c.pie.device~keyEvents")).toEqual({ id: "c.pie.device", metric: "keyEvents", grain: "day" });
    expect(splitRequestId("c.pie.device~bogus")).toEqual({ id: "c.pie.device", metric: null, grain: "day" });
  });

  it("builds GA4 reports: time series by date, breakdowns by the chosen metric, key events resolved", () => {
    const line = chartSpec("c.line.sessions", null, ctx)!;
    const lineBody = line.body as { dimensions: { name: string }[] };
    expect(lineBody.dimensions[0].name).toBe("date");
    const series = line.parse([{ dimensionValues: [{ value: "20260102" }], metricValues: [{ value: "7" }] }]);
    expect(series).toEqual({ kind: "series", format: "number", rows: [{ date: "2026-01-02", value: 7 }] });

    const pie = chartSpec("c.pie.device", "keyEvents", ctx)!.body as { metrics: { name: string }[]; dimensions: { name: string }[] };
    expect(pie.metrics[0].name).toBe("conversions");
    expect(pie.dimensions[0].name).toBe("deviceCategory");

    const rate = chartSpec("c.number.engagementRate", null, ctx)!;
    const rows = [
      { dimensionValues: [{ value: "date_range_0" }], metricValues: [{ value: "0.4" }] },
      { dimensionValues: [{ value: "date_range_1" }], metricValues: [{ value: "0.5" }] },
    ];
    expect(rate.parse(rows)).toEqual({ kind: "score", value: 40, prev: 50, format: "percent" });
  });

  it("stacked area keeps the top channels and folds the rest into Other", () => {
    const spec = chartSpec("c.stacked.sessions", null, ctx)!;
    const rows = ["A", "B", "C", "D", "E", "F", "G"].map((ch, i) => ({
      dimensionValues: [{ value: "20260101" }, { value: ch }],
      metricValues: [{ value: String(10 - i) }],
    }));
    const d = spec.parse(rows);
    expect(d.kind === "stack" && d.series).toEqual(["A", "B", "C", "D", "E", "Other"]);
    expect(d.kind === "stack" && d.rows[0].s5).toBe(5 + 4); // F + G
  });
});

describe("time chart grain", () => {
  it("request ids carry a valid grain", () => {
    expect(splitRequestId("c.line.sessions@week")).toEqual({ id: "c.line.sessions", metric: null, grain: "week" });
    expect(splitRequestId("c.line.sessions@hour").grain).toBe("day");
    expect(splitRequestId("c.pie.device~sessions").grain).toBe("day");
  });

  it("buckets by GA4 date ranges, 4 per report, mapping rows back to bucket starts", async () => {
    const { bucketedTimeSpec } = await import("@/lib/chart-widgets");
    const qctx = { ...ctx, current: [{ startDate: "2026-01-01", endDate: "2026-06-30" }] };
    const spec = bucketedTimeSpec("c.line.totalUsers", "month", qctx)!;
    expect(spec.bodies).toHaveLength(2); // 6 months -> 4 + 2 ranges
    const r = (range: number, v: number) => ({ dimensionValues: [{ value: `date_range_${range}` }], metricValues: [{ value: String(v) }] });
    const d = spec.parse([[r(0, 10), r(3, 40)], [r(1, 60)]]);
    expect(d.kind === "series" && d.rows).toEqual([
      { date: "2026-01-01", value: 10 },
      { date: "2026-02-01", value: 0 },
      { date: "2026-03-01", value: 0 },
      { date: "2026-04-01", value: 40 },
      { date: "2026-05-01", value: 0 },
      { date: "2026-06-01", value: 60 },
    ]);
    expect(d.kind === "series" && d.grain).toBe("month");
  });

  it("stacked charts bucket per channel too", async () => {
    const { bucketedTimeSpec } = await import("@/lib/chart-widgets");
    const qctx = { ...ctx, current: [{ startDate: "2026-01-01", endDate: "2026-03-31" }] };
    const spec = bucketedTimeSpec("c.stacked.sessions", "quarter", qctx)!;
    const row = (ch: string, v: number) => ({ dimensionValues: [{ value: ch }, { value: "date_range_0" }], metricValues: [{ value: String(v) }] });
    const d = spec.parse([[row("Direct", 5), row("Email", 2)]]);
    expect(d.kind === "stack" && d.series).toEqual(["Direct", "Email"]);
    expect(d.kind === "stack" && d.rows).toEqual([{ date: "2026-01-01", s0: 5, s1: 2 }]);
  });
});
