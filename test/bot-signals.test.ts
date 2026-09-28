import { describe, expect, it } from "vitest";
import { scoreSegment, spikeDays } from "@/lib/bot-signals";

const seg = (over: Partial<Parameters<typeof scoreSegment>[1]> = {}) => ({
  value: "United States", sessions: 100, engagedSessions: 60, engagementSeconds: 6000, newUsers: 50, users: 80, ...over,
});

describe("bot signals", () => {
  it("leaves normal traffic alone", () => {
    const s = scoreSegment("country", seg());
    expect(s.level).toBe("ok");
    expect(s.reasons).toEqual([]);
  });

  it("flags zero-engagement Singapore traffic as bots", () => {
    const s = scoreSegment("country", seg({ value: "Singapore", engagedSessions: 0, engagementSeconds: 0, newUsers: 99, users: 100 }));
    expect(s.level).toBe("bot");
    expect(s.score).toBe(95);
    expect(s.reasons).toContain("Common bot / datacenter country");
  });

  it("flags datacenter cities and headless screen sizes", () => {
    expect(scoreSegment("city", seg({ value: "Ashburn", engagedSessions: 8 })).level).toBe("suspicious");
    expect(scoreSegment("screenResolution", seg({ value: "800x600", engagedSessions: 2, engagementSeconds: 50 })).level).toBe("bot");
  });

  it("ignores tiny segments", () => {
    expect(scoreSegment("country", seg({ value: "Singapore", sessions: 3, engagedSessions: 0, engagementSeconds: 0 })).level).toBe("ok");
  });

  it("finds unengaged spike days", () => {
    const days = Array.from({ length: 10 }, (_, i) => ({ date: `2026-01-${10 + i}`, sessions: 50, engagedSessions: 30 }));
    days[4] = { date: "2026-01-14", sessions: 400, engagedSessions: 20 };
    expect([...spikeDays(days)]).toEqual(["2026-01-14"]);
  });
});
