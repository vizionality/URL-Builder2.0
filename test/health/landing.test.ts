import { describe, it, expect } from "vitest";
import { checkLandingPages } from "@/lib/health/checks";
import { baselineDates } from "@/lib/health/baseline";
import { parseConfig } from "@/lib/health/config";
import type { PageDayRow, TopPageRow } from "@/lib/health/types";

const config = parseConfig({ property_id: "123" });
const target = "2026-03-16";
const baseDates = baselineDates(target, config.baselineWeeks);

// Builds a page's baseline days at a fixed conversion rate, plus a target day.
function series(
  page: string,
  baseSessions: number,
  baseCr: number,
  targetSessions: number,
  targetCr: number
): PageDayRow[] {
  const rows: PageDayRow[] = baseDates.map((date) => ({
    date,
    page,
    sessions: baseSessions,
    keyEvents: Math.round(baseSessions * baseCr),
  }));
  rows.push({
    date: target,
    page,
    sessions: targetSessions,
    keyEvents: Math.round(targetSessions * targetCr),
  });
  return rows;
}

describe("landing page conversion checks", () => {
  it("steady conversion rate -> no alert", () => {
    const top: TopPageRow[] = [{ page: "/a", sessions: 200 }];
    const a = checkLandingPages(top, series("/a", 100, 0.1, 200, 0.1), target, baseDates, config);
    expect(a).toEqual([]);
  });

  it("conversion rate halved -> MEDIUM", () => {
    const top: TopPageRow[] = [{ page: "/a", sessions: 200 }];
    const a = checkLandingPages(top, series("/a", 100, 0.1, 200, 0.05), target, baseDates, config);
    expect(a).toHaveLength(1);
    expect(a[0].severity).toBe("MEDIUM");
  });

  it("conversion rate to zero -> HIGH", () => {
    const top: TopPageRow[] = [{ page: "/a", sessions: 200 }];
    const a = checkLandingPages(top, series("/a", 100, 0.1, 200, 0), target, baseDates, config);
    expect(a).toHaveLength(1);
    expect(a[0].severity).toBe("HIGH");
  });

  it("low-volume page (below min_sessions_page) is ignored", () => {
    const top: TopPageRow[] = [{ page: "/b", sessions: 30 }];
    // Even a total conversion collapse is ignored below the volume floor.
    const a = checkLandingPages(top, series("/b", 100, 0.1, 30, 0), target, baseDates, config);
    expect(a).toEqual([]);
  });
});
