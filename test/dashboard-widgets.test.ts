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

  it("groups consecutive scorecards into one row", () => {
    expect(layoutBlocks(["sc.views", "sc.sessions", "geo", "sc.newUsers"])).toEqual([
      { kind: "scorecards", ids: ["sc.views", "sc.sessions"] },
      { kind: "widget", id: "geo" },
      { kind: "scorecards", ids: ["sc.newUsers"] },
    ]);
  });

  it("asks the server only for sections the layout uses", () => {
    expect(overviewParts(["sc.views", "sc.sessions", "geo"])).toEqual(["geo", "summary"]);
    expect(breakdownParts(["conversions", "geo"])).toEqual(["conversions"]);
    expect(overviewParts(DEFAULT_LAYOUT)).toEqual(["channel", "geo", "monthly", "states", "summary"]);
  });
});
