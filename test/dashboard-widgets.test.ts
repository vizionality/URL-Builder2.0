import { describe, it, expect } from "vitest";
import {
  breakdownParts,
  DEFAULT_LAYOUT,
  layoutBlocks,
  overviewParts,
  sanitizeLayout,
} from "@/lib/dashboard-widgets";

describe("dashboard layout", () => {
  it("keeps known ids once, in order", () => {
    expect(sanitizeLayout(["geo", "nope", "geo", 5, "sc.views"])).toEqual(["geo", "sc.views"]);
    expect(sanitizeLayout("geo")).toEqual([]);
  });

  it("keeps every scorecard in one Summary row, where the first one sits", () => {
    expect(layoutBlocks(["monthly", "sc.views", "sc.sessions", "geo", "sc.newUsers"])).toEqual([
      { kind: "widget", id: "monthly" },
      { kind: "scorecards", ids: ["sc.views", "sc.sessions", "sc.newUsers"] },
      { kind: "widget", id: "geo" },
    ]);
  });

  it("asks the server only for sections the layout uses", () => {
    expect(overviewParts(["sc.views", "sc.sessions", "geo"])).toEqual(["geo", "summary"]);
    expect(breakdownParts(["conversions", "geo"])).toEqual(["conversions"]);
    expect(overviewParts(DEFAULT_LAYOUT)).toEqual(["channel", "geo", "monthly", "states", "summary"]);
  });
});

describe("applyDrop", () => {
  it("reorders, adds from the sidebar, and removes to the sidebar", async () => {
    const { applyDrop, DASHBOARD_DROP, SIDEBAR_DROP } = await import("@/lib/dashboard-widgets");
    const l = ["monthly", "channel", "geo"];
    expect(applyDrop(l, "geo", "monthly")).toEqual(["geo", "monthly", "channel"]);
    expect(applyDrop(l, "monthly", "geo")).toEqual(["channel", "geo", "monthly"]);
    expect(applyDrop(l, "new:states", "channel")).toEqual(["monthly", "states", "channel", "geo"]);
    expect(applyDrop(l, "new:states", DASHBOARD_DROP)).toEqual(["monthly", "channel", "geo", "states"]);
    expect(applyDrop(l, "channel", SIDEBAR_DROP)).toEqual(["monthly", "geo"]);
    // No-ops: nowhere, already present, unknown widget.
    expect(applyDrop(l, "geo", null)).toBe(l);
    expect(applyDrop(l, "new:geo", DASHBOARD_DROP)).toBe(l);
    expect(applyDrop(l, "new:bogus", DASHBOARD_DROP)).toBe(l);
  });
});

describe("extra widget parts", () => {
  it("extra scorecards don't pull in the overview summary", async () => {
    const { overviewParts, extraParts } = await import("@/lib/dashboard-widgets");
    expect(overviewParts(["sc.bounceRate", "device"])).toEqual([]);
    expect(extraParts(["device", "geo", "sc.bounceRate"])).toEqual(["sc.bounceRate", "device"]);
  });
});
