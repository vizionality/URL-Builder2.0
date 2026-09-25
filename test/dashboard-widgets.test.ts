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
    // Any width 1-12 is kept (a widget filling a slot takes the slot's width); out of range is dropped.
    expect(sanitizeLayout(["monthly|6", "geo|7", "channel|13", "sc.views|6", "monthly"])).toEqual([
      "monthly|6", "geo|7", "channel", "sc.views|6",
    ]);
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
    // Geo's row has 8 columns free, shown as an empty slot.
    expect(added).toEqual({
      ids: ["device", "monthly", "geo", "gap:1"],
      spans: { monthly: 6, device: 6, "gap:1": 8 },
    });
    const moved = dropWithSpans(["monthly", "geo"], {}, "geo", "monthly");
    expect(moved).toEqual({ ids: ["geo", "monthly"], spans: { monthly: 6, geo: 6 } });
    const reorder = dropWithSpans(["monthly", "sources"], {}, "sources", "monthly");
    expect(reorder).toEqual({ ids: ["sources", "monthly"], spans: {} });
  });
});

describe("empty slots", () => {
  it("shrinking leaves a slot, growing takes it back", async () => {
    const { resizeWithGap } = await import("@/lib/dashboard-widgets");
    const small = resizeWithGap(["monthly", "channel"], {}, "monthly", 6);
    expect(small).toEqual({ ids: ["monthly", "gap:1", "channel"], spans: { monthly: 6, "gap:1": 6 } });
    // Shrinking again widens the same slot rather than adding another.
    const smaller = resizeWithGap(small.ids, small.spans, "monthly", 3);
    expect(smaller.spans["gap:1"]).toBe(9);
    expect(smaller.ids).toEqual(["monthly", "gap:1", "channel"]);
    // Growing back to full removes the slot.
    expect(resizeWithGap(smaller.ids, smaller.spans, "monthly", 12)).toEqual({
      ids: ["monthly", "channel"],
      spans: { monthly: 12 },
    });
  });

  it("dropping a widget on a slot fills it at the slot's width", async () => {
    const { dropWithSpans } = await import("@/lib/dashboard-widgets");
    const base = { ids: ["monthly", "gap:1", "geo"], spans: { monthly: 6, "gap:1": 6 } };
    expect(dropWithSpans(base.ids, base.spans, "new:device", "gap:1")).toEqual({
      ids: ["monthly", "device", "geo", "gap:1"],
      spans: { monthly: 6, device: 6, "gap:1": 8 },
    });
    expect(dropWithSpans(base.ids, base.spans, "geo", "gap:1")).toEqual({
      ids: ["monthly", "geo"],
      spans: { monthly: 6, geo: 6 },
    });
    // A scorecard dropped in a slot sits on its own there, at the slot's width.
    expect(dropWithSpans(base.ids, base.spans, "new:sc.bounceRate", "gap:1")).toEqual({
      ids: ["monthly", "sc.bounceRate", "geo", "gap:1"],
      spans: { monthly: 6, "sc.bounceRate": 6, "gap:1": 8 },
    });
  });

  it("slots survive save and load, and group as their own blocks", async () => {
    const { parseLayout, serializeLayout, layoutBlocks, sanitizeLayout } = await import("@/lib/dashboard-widgets");
    const saved = serializeLayout(["monthly", "gap:1"], { monthly: 6, "gap:1": 6 });
    expect(saved).toEqual(["monthly|6", "gap:1|6"]);
    expect(parseLayout(saved)).toEqual({ ids: ["monthly", "gap:1"], spans: { monthly: 6, "gap:1": 6 } });
    expect(sanitizeLayout(["gap:1", "gap:x|20", "gap:BAD|4"])).toEqual([]);
    expect(layoutBlocks(["monthly", "gap:1"])).toEqual([
      { kind: "widget", id: "monthly" },
      { kind: "gap", id: "gap:1" },
    ]);
  });
});

describe("version history", () => {
  it("lists what a restore would add and remove, ignoring widths and slots", async () => {
    const { versionDiff, widgetCount } = await import("@/lib/dashboard-widgets");
    const current = ["monthly|6", "gap:1|6", "geo", "device"];
    const version = ["monthly", "geo", "sources"];
    expect(versionDiff(current, version)).toEqual({ added: ["Top Traffic Sources"], removed: ["Device category"] });
    expect(versionDiff(current, ["geo", "monthly|12", "device"])).toEqual({ added: [], removed: [] });
    expect(widgetCount(current)).toBe(3);
  });
});

describe("rows keep their shape", () => {
  it("fills unused width in every row with one slot, merging neighbours and dropping empty rows", async () => {
    const { normalizeLayout } = await import("@/lib/dashboard-widgets");
    // monthly 8 + channel 4 = full; states 4 + geo 4 leaves 4.
    expect(normalizeLayout(["monthly", "channel", "states", "geo"], { monthly: 8 })).toEqual({
      ids: ["monthly", "channel", "states", "geo", "gap:1"],
      spans: { monthly: 8, "gap:1": 4 },
    });
    // Two slots side by side merge; a row of only slots disappears.
    expect(
      normalizeLayout(["monthly", "gap:a", "gap:b", "sources", "gap:c"], { monthly: 6, "gap:a": 3, "gap:b": 3, "gap:c": 12 })
    ).toEqual({ ids: ["monthly", "gap:1", "sources"], spans: { monthly: 6, "gap:1": 6 } });
    // The Summary row is always full and later scorecards stay with it.
    expect(normalizeLayout(["sc.views", "geo", "sc.sessions"], {})).toEqual({
      ids: ["sc.views", "geo", "sc.sessions", "gap:1"],
      spans: { "gap:1": 8 },
    });
  });

  it("moving a widget to another row leaves its old spot empty", async () => {
    const { dropWithSpans } = await import("@/lib/dashboard-widgets");
    // Row 1: monthly 8 + channel 4. Row 2: states 4 + geo 4 (+ 4 empty).
    const ids = ["monthly", "channel", "states", "geo", "gap:1"];
    const spans = { monthly: 8, "gap:1": 4 };
    expect(dropWithSpans(ids, spans, "channel", "states")).toEqual({
      ids: ["monthly", "gap:1", "channel", "states", "geo"],
      spans: { monthly: 8, "gap:1": 4 },
    });
    // Within one row it's a plain reorder.
    expect(dropWithSpans(ids, spans, "geo", "states").ids).toEqual(["monthly", "channel", "geo", "states", "gap:1"]);
  });

  it("removing a widget leaves its space empty", async () => {
    const { removeWidget } = await import("@/lib/dashboard-widgets");
    expect(removeWidget(["channel", "states", "geo"], {}, "states")).toEqual({
      ids: ["channel", "gap:1", "geo"],
      spans: { "gap:1": 4 },
    });
  });
});

describe("standalone scorecards", () => {
  it("a scorecard with a width is its own block and round-trips", async () => {
    const { layoutBlocks, parseLayout, serializeLayout } = await import("@/lib/dashboard-widgets");
    const spans = { "sc.keyEvents": 12 };
    expect(layoutBlocks(["sc.views", "monthly", "sc.keyEvents"], spans)).toEqual([
      { kind: "scorecards", ids: ["sc.views"] },
      { kind: "widget", id: "monthly" },
      { kind: "widget", id: "sc.keyEvents" },
    ]);
    // Even at full width the span is kept, since it marks "on its own".
    expect(serializeLayout(["sc.keyEvents"], spans)).toEqual(["sc.keyEvents|12"]);
    expect(parseLayout(["sc.keyEvents|12"]).spans).toEqual(spans);
  });

  it("dropping it on a Summary scorecard puts it back in the Summary row", async () => {
    const { dropWithSpans } = await import("@/lib/dashboard-widgets");
    const out = dropWithSpans(["sc.views", "monthly", "sc.keyEvents"], { monthly: 6, "sc.keyEvents": 6 }, "sc.keyEvents", "sc.views");
    expect(out.spans["sc.keyEvents"]).toBeUndefined();
    expect(out.ids.slice(0, 2)).toEqual(["sc.keyEvents", "sc.views"]);
  });
});

describe("any card fits anywhere", () => {
  it("a scorecard dropped beside a widget stands on its own at 25%", async () => {
    const { dropWithSpans } = await import("@/lib/dashboard-widgets");
    const out = dropWithSpans(["sc.views", "channel", "states", "geo"], {}, "new:sc.keyEvents", "states");
    expect(out.ids).toContain("sc.keyEvents");
    expect(out.spans["sc.keyEvents"]).toBe(3);
    // A Summary scorecard dragged out next to Geo Map leaves the Summary row.
    const moved = dropWithSpans(["sc.views", "sc.sessions", "geo"], {}, "sc.sessions", "geo");
    expect(moved.spans["sc.sessions"]).toBe(3);
  });
});
