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

describe("widths", () => {
  it("parses and serializes custom widths, keeping defaults implicit", async () => {
    const { parseLayout, serializeLayout, sanitizeLayout } = await import("@/lib/dashboard-widgets");
    expect(sanitizeLayout(["monthly|6", "geo|7", "sc.views|6", "monthly"])).toEqual(["monthly|6", "geo", "sc.views"]);
    const { ids, spans } = parseLayout(["monthly|6", "geo|4", "channel|12"]);
    expect(ids).toEqual(["monthly", "geo", "channel"]);
    expect(spans).toEqual({ monthly: 6, channel: 12 });
    expect(serializeLayout(ids, spans)).toEqual(["monthly|6", "geo", "channel|12"]);
  });

  it("snaps to 25/33/50/75/100%", async () => {
    const { snapSpan } = await import("@/lib/dashboard-widgets");
    expect([1, 3.4, 4.9, 5.2, 8, 10.6, 11].map(snapSpan)).toEqual([3, 3, 4, 6, 9, 12, 12]);
  });

  it("a widget dropped on a full-width one pairs them 50/50; full on full just reorders", async () => {
    const { dropWithSpans } = await import("@/lib/dashboard-widgets");
    const added = dropWithSpans(["monthly", "geo"], {}, "new:device", "monthly");
    expect(added).toEqual({ ids: ["device", "monthly", "geo"], spans: { monthly: 6, device: 6 } });
    const moved = dropWithSpans(["monthly", "geo"], {}, "geo", "monthly");
    expect(moved).toEqual({ ids: ["geo", "monthly"], spans: { monthly: 6, geo: 6 } });
    const reorder = dropWithSpans(["monthly", "sources"], {}, "sources", "monthly");
    expect(reorder).toEqual({ ids: ["sources", "monthly"], spans: {} });
  });
});
