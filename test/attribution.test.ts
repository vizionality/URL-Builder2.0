import { describe, expect, it } from "vitest";
import { attribute, weights, type Touch } from "@/lib/attribution";

const DAY = 86_400_000;
const t = (day: number, source: string, medium: string, campaign = ""): Touch => ({ ts: day * DAY, source, medium, campaign });
const path = [t(0, "google", "organic"), t(3, "facebook", "paid_social", "summer"), t(6, "(direct)", "(none)")];

describe("attribution weights", () => {
  it("gives single-touch models all credit to the right touch", () => {
    expect(weights(path, "first", 6 * DAY)).toEqual([1, 0, 0]);
    expect(weights(path, "last", 6 * DAY)).toEqual([0, 0, 1]);
    expect(weights(path, "lastNonDirect", 6 * DAY)).toEqual([0, 1, 0]);
  });

  it("splits credit for multi-touch models, summing to 1", () => {
    expect(weights(path, "linear", 6 * DAY).map((x) => +x.toFixed(4))).toEqual([0.3333, 0.3333, 0.3333]);
    expect(weights(path, "position", 6 * DAY)).toEqual([0.4, 0.2, 0.4]);
    expect(weights(path.slice(0, 2), "position", 6 * DAY)).toEqual([0.5, 0.5]);
    const td = weights(path, "timeDecay", 6 * DAY);
    expect(td.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(td[2]).toBeGreaterThan(td[1]);
    expect(td[1]).toBeGreaterThan(td[0]);
  });

  it("keeps direct when it's the only touch", () => {
    expect(weights([t(0, "(direct)", "(none)")], "lastNonDirect", 0)).toEqual([1]);
  });
});

describe("attribute", () => {
  it("credits channels and campaigns and builds paths within the lookback", () => {
    const touches = new Map([["v1", path], ["v2", [t(-60, "bing", "cpc"), t(9, "google", "organic")]]]);
    const r = attribute(
      [{ visitor: "v1", ts: 6 * DAY, value: 100 }, { visitor: "v2", ts: 10 * DAY, value: 0 }, { visitor: "v3", ts: 10 * DAY, value: 0 }],
      touches,
      30
    );
    expect(r.conversions).toBe(3);
    expect(r.unattributed).toBe(1);
    expect(r.revenue).toBe(100);
    const google = r.byChannel.find((x) => x.key === "google / organic")!;
    expect(google.credit.first.conversions).toBe(2); // v1 first touch + v2's only touch in window
    const fb = r.byChannel.find((x) => x.key === "facebook / paid_social")!;
    expect(fb.credit.lastNonDirect.revenue).toBe(100);
    expect(r.byChannel.find((x) => x.key === "bing / cpc")).toBeUndefined(); // outside the 30-day lookback
    expect(r.byCampaign.find((x) => x.key === "summer")!.credit.position.conversions).toBeCloseTo(0.2);
    expect(r.paths[0].conversions).toBe(1);
    expect(r.avgTouches).toBe(2);
  });
});
