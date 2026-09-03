import { describe, it, expect } from "vitest";
import { checkTraffic, checkQuality } from "@/lib/health/checks";
import { baselineDates } from "@/lib/health/baseline";
import { parseConfig } from "@/lib/health/config";
import type { TrafficRow } from "@/lib/health/types";

const config = parseConfig({ property_id: "123", site_domain: "example.com" });
const target = "2026-03-16";
const baseDates = baselineDates(target, config.baselineWeeks);

function traffic(base: Partial<TrafficRow>, tgt: Partial<TrafficRow>): TrafficRow[] {
  const b: TrafficRow = { date: "", sessions: 1000, totalUsers: 800, keyEvents: 100, ...base };
  const rows: TrafficRow[] = baseDates.map((date) => ({ ...b, date }));
  rows.push({ ...b, ...tgt, date: target });
  return rows;
}

describe("check 2: traffic & revenue", () => {
  it("skips entirely when baseline sessions are below the floor", () => {
    const a = checkTraffic(traffic({ sessions: 50 }, { sessions: 10 }), target, baseDates, config);
    expect(a).toEqual([]);
  });

  it("a key-events drop is HIGH; a sessions drop is MEDIUM", () => {
    const a = checkTraffic(
      traffic({}, { sessions: 400, keyEvents: 20 }),
      target,
      baseDates,
      config
    );
    const sessions = a.find((x) => x.subject === "Sessions");
    const key = a.find((x) => x.subject === "Key events");
    expect(sessions?.severity).toBe("MEDIUM");
    expect(key?.severity).toBe("HIGH");
  });

  it("handles properties with no revenue (undefined) without erroring", () => {
    // No totalRevenue anywhere: revenue metric is simply skipped.
    const a = checkTraffic(traffic({}, { keyEvents: 20 }), target, baseDates, config);
    expect(a.every((x) => x.subject !== "Revenue")).toBe(true);
  });

  it("a revenue drop is HIGH when revenue is present", () => {
    const a = checkTraffic(
      traffic({ totalRevenue: 5000 }, { totalRevenue: 1000 }),
      target,
      baseDates,
      config
    );
    const rev = a.find((x) => x.subject === "Revenue");
    expect(rev?.severity).toBe("HIGH");
  });
});

describe("check 3: data quality drift", () => {
  it("flags a high Unassigned share", () => {
    const a = checkQuality(
      [
        { channelGroup: "Unassigned", sessions: 300 },
        { channelGroup: "Organic Search", sessions: 700 },
      ],
      [],
      [],
      config
    );
    expect(a.some((x) => x.subject === "Unassigned traffic")).toBe(true);
  });

  it("flags paid sessions with no campaign name", () => {
    const a = checkQuality(
      [],
      [
        { medium: "cpc", campaign: "(not set)", sessions: 400 },
        { medium: "cpc", campaign: "spring_sale", sessions: 100 },
        { medium: "organic", campaign: "(not set)", sessions: 999 }, // not paid, ignored
      ],
      [],
      config
    );
    expect(a.some((x) => x.subject === "Paid traffic missing campaign")).toBe(true);
  });

  it("flags self referrals from the configured domain", () => {
    const a = checkQuality(
      [],
      [],
      [
        { source: "example.com", sessions: 40 },
        { source: "google", sessions: 900 },
      ],
      config
    );
    expect(a.some((x) => x.subject === "Self referrals")).toBe(true);
  });
});
