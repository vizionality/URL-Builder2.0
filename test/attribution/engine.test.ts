import { describe, it, expect } from "vitest";
import {
  buildPaths,
  attribute,
  runReport,
  type EngineTouch,
  type EngineConversion,
  type IdentityLink,
} from "@/lib/attribution/engine";

const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString();

// A single visitor with a clean Paid Search -> Email -> Direct path.
function touch(visitorId: string, day: number, source: string, medium: string): EngineTouch {
  return {
    visitorId,
    occurredAt: iso(2026, 3, day),
    source,
    medium,
    campaign: null,
    clickIds: {},
    referrer: null,
  };
}

describe("buildPaths", () => {
  it("assembles the ordered channel path up to the conversion", () => {
    const touches: EngineTouch[] = [
      touch("v1", 1, "google", "cpc"), // Paid Search
      touch("v1", 3, "newsletter", "email"), // Email
      touch("v1", 5, "", "(none)"), // Direct-ish (no match)
    ];
    const conv: EngineConversion[] = [{ visitorId: "v1", occurredAt: iso(2026, 3, 6), value: 100 }];
    const paths = buildPaths(touches, conv, []);
    expect(paths).toHaveLength(1);
    expect(paths[0].channels).toEqual(["Paid Search", "Email", "Direct"]);
    expect(paths[0].value).toBe(100);
  });

  it("merges identity-linked visitors into one path (cross-device)", () => {
    const touches: EngineTouch[] = [
      touch("phone", 1, "facebook", "social"), // Organic Social
      touch("laptop", 4, "google", "cpc"), // Paid Search
    ];
    const conv: EngineConversion[] = [{ visitorId: "laptop", occurredAt: iso(2026, 3, 5), value: 0 }];
    const links: IdentityLink[] = [
      { visitorId: "phone", identityKey: "u1" },
      { visitorId: "laptop", identityKey: "u1" },
    ];
    const paths = buildPaths(touches, conv, links);
    expect(paths[0].channels).toEqual(["Organic Social", "Paid Search"]);
  });

  it("a conversion with no prior touch is credited to Direct", () => {
    const conv: EngineConversion[] = [{ visitorId: "ghost", occurredAt: iso(2026, 3, 6), value: 50 }];
    const paths = buildPaths([], conv, []);
    expect(paths[0].channels).toEqual(["Direct"]);
  });
});

describe("attribute", () => {
  it("linear splits one conversion evenly across its channels", () => {
    const touches: EngineTouch[] = [
      touch("v1", 1, "google", "cpc"),
      touch("v1", 3, "newsletter", "email"),
    ];
    const conv: EngineConversion[] = [{ visitorId: "v1", occurredAt: iso(2026, 3, 4), value: 200 }];
    const paths = buildPaths(touches, conv, []);
    const credit = attribute(paths, "linear");
    const bySource = Object.fromEntries(credit.map((c) => [c.channel, c]));
    expect(bySource["Paid Search"].conversions).toBeCloseTo(0.5, 6);
    expect(bySource["Email"].conversions).toBeCloseTo(0.5, 6);
    expect(bySource["Paid Search"].value).toBeCloseTo(100, 6);
    expect(bySource["Email"].value).toBeCloseTo(100, 6);
  });

  it("first vs last assign full credit to the right end", () => {
    const touches: EngineTouch[] = [
      touch("v1", 1, "google", "cpc"), // first
      touch("v1", 3, "newsletter", "email"), // last
    ];
    const conv: EngineConversion[] = [{ visitorId: "v1", occurredAt: iso(2026, 3, 4), value: 0 }];
    const paths = buildPaths(touches, conv, []);
    const first = Object.fromEntries(attribute(paths, "first").map((c) => [c.channel, c.conversions]));
    const last = Object.fromEntries(attribute(paths, "last").map((c) => [c.channel, c.conversions]));
    expect(first["Paid Search"]).toBeCloseTo(1, 6);
    expect(first["Email"] ?? 0).toBeCloseTo(0, 6);
    expect(last["Email"]).toBeCloseTo(1, 6);
  });
});

describe("runReport", () => {
  it("reports empty states explicitly", () => {
    expect(runReport([], [], [], "linear").empty).toBe("no-touches");
    const t = [touch("v1", 1, "google", "cpc")];
    expect(runReport(t, [], [], "linear").empty).toBe("no-conversions");
  });

  it("aggregates totals, unique visitors, and averages", () => {
    const touches: EngineTouch[] = [
      touch("v1", 1, "google", "cpc"),
      touch("v1", 3, "newsletter", "email"),
      touch("v2", 2, "facebook", "social"),
    ];
    const conv: EngineConversion[] = [
      { visitorId: "v1", occurredAt: iso(2026, 3, 4), value: 200 },
      { visitorId: "v2", occurredAt: iso(2026, 3, 3), value: 50 },
    ];
    const report = runReport(touches, conv, [], "linear");
    expect(report.empty).toBeNull();
    expect(report.totalConversions).toBe(2);
    expect(report.totalValue).toBe(250);
    expect(report.uniqueVisitors).toBe(2);
    // v1 path has 2 touches, v2 has 1 -> average 1.5
    expect(report.avgTouchesPerConversion).toBeCloseTo(1.5, 6);
    // credit conversions across channels sum to the number of conversions
    const totalCredit = report.byChannel.reduce((s, c) => s + c.conversions, 0);
    expect(totalCredit).toBeCloseTo(2, 6);
  });
});
