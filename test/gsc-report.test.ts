import { describe, expect, it } from "vitest";
import { dailySeries, itemsOf, pagePath, siteLabel, totalsOf } from "@/lib/gsc-report";

describe("gsc-report", () => {
  it("reads totals from the single no-dimension row", () => {
    expect(totalsOf([{ clicks: 5, impressions: 100, ctr: 0.05, position: 7.2 }])).toEqual({ clicks: 5, impressions: 100, ctr: 0.05, position: 7.2 });
    expect(totalsOf(undefined).clicks).toBe(0);
  });

  it("maps keyed rows to items", () => {
    expect(itemsOf([{ keys: ["shoes"], clicks: 1, impressions: 2, ctr: 0.5, position: 3 }])[0].key).toBe("shoes");
  });

  it("zero-fills missing days", () => {
    const s = dailySeries([{ keys: ["2026-01-02"], clicks: 3, impressions: 9, ctr: 0.33, position: 4 }], "2026-01-01", "2026-01-03");
    expect(s.map((d) => d.clicks)).toEqual([0, 3, 0]);
    expect(s[2].date).toBe("2026-01-03");
  });

  it("labels sites and pages", () => {
    expect(siteLabel("sc-domain:example.com")).toBe("example.com (domain)");
    expect(siteLabel("https://www.example.com/")).toBe("www.example.com");
    expect(pagePath("https://example.com/a/b?x=1")).toBe("/a/b?x=1");
    expect(pagePath("not a url")).toBe("not a url");
  });
});
