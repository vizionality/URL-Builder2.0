import { describe, expect, it } from "vitest";
import { changes, digestText, parseOverview } from "@/lib/ai-overview";

describe("ai-overview", () => {
  it("computes percent changes and skips missing priors", () => {
    expect(changes({ a: 150, b: 5 }, { a: 100, b: 0 })).toEqual({ a: 50, b: null });
  });

  it("builds a digest with only the connected sources", () => {
    const text = digestText({
      range: { startDate: "2026-09-01", endDate: "2026-09-28", previousStart: "2026-08-04", previousEnd: "2026-08-31" },
      ga4: null,
      gsc: { site: "sc-domain:x.com", totals: { clicks: 10.123 }, previous: { clicks: 5 }, queries: [], pages: [] },
    });
    const o = JSON.parse(text);
    expect(o.ga4).toBeUndefined();
    expect(o.searchConsole.totals.clicks).toBe(10.12);
    expect(o.searchConsole.pctChangeVsPrevious.clicks).toBe(102.46);
  });

  it("parses a JSON reply, tolerating surrounding text", () => {
    const o = parseOverview('Here:\n{"headline":"Up","summary":"Good","wins":["a",""],"concerns":"x","actions":["b"]}');
    expect(o).toEqual({ headline: "Up", summary: "Good", wins: ["a"], concerns: [], actions: ["b"] });
    expect(parseOverview("no json")).toBeNull();
    expect(parseOverview('{"headline":1}')).toBeNull();
  });
});
