import { describe, it, expect } from "vitest";
import { EXTRA_SPECS, finishPageTitles } from "@/lib/extra-widgets";
import { EXTRA_WIDGET_IDS, WIDGET_BY_ID, DEFAULT_LAYOUT } from "@/lib/dashboard-widgets";

const ctx = {
  current: [{ startDate: "2026-01-01", endDate: "2026-01-31" }],
  withPrev: [{ startDate: "2026-01-01", endDate: "2026-01-31" }, { startDate: "2025-12-01", endDate: "2025-12-31" }],
  keyMetric: "conversions",
  filter: {},
};

describe("extra widgets", () => {
  it("every extra widget has a catalog entry and a report spec, and none is on by default", () => {
    for (const id of EXTRA_WIDGET_IDS) {
      expect(WIDGET_BY_ID.has(id)).toBe(true);
      expect(EXTRA_SPECS[id]).toBeDefined();
      expect(DEFAULT_LAYOUT).not.toContain(id);
    }
  });

  it("scorecards read current and previous ranges and scale rates", () => {
    const rows = [
      { dimensionValues: [{ value: "date_range_1" }], metricValues: [{ value: "0.5" }] },
      { dimensionValues: [{ value: "date_range_0" }], metricValues: [{ value: "0.42" }] },
    ];
    expect(EXTRA_SPECS["sc.bounceRate"].parse(rows)).toEqual({ kind: "score", value: 42, prev: 50, format: "percent" });
    const body = EXTRA_SPECS["sc.keyEvents"].body(ctx) as { metrics: { name: string }[] };
    expect(body.metrics[0].name).toBe("conversions");
  });

  it("hour of day sorts by hour, others by value", () => {
    const rows = ["10", "2", "0"].map((h, i) => ({ dimensionValues: [{ value: h }], metricValues: [{ value: String(i + 1) }] }));
    const d = EXTRA_SPECS.hourOfDay.parse(rows);
    expect(d.kind === "list" && d.rows.map((r) => r.label)).toEqual(["0", "2", "10"]);
  });

  it("page titles report engagement seconds per user", () => {
    const d = finishPageTitles({ kind: "table", columns: [], rows: [{ label: "Home", values: [100, 40, 1200] }] });
    expect(d.rows[0].values).toEqual([100, 40, 30]);
  });
});
