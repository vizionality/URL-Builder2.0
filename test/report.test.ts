import { describe, it, expect } from "vitest";
import {
  pctDelta,
  formatDuration,
  compact,
  formatYearMonth,
  previousPeriod,
  shiftYear,
  pivotDaily,
  shade,
  presetRange,
  comparisonRange,
} from "@/lib/report";

describe("report formatters", () => {
  it("pctDelta compares and guards a zero baseline", () => {
    expect(pctDelta(150, 100)).toBeCloseTo(50, 6);
    expect(pctDelta(50, 100)).toBeCloseTo(-50, 6);
    expect(pctDelta(5, 0)).toBeNull();
    expect(pctDelta(0, 0)).toBe(0);
  });

  it("formatDuration renders mm:ss", () => {
    expect(formatDuration(63)).toBe("01:03");
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("compact matches GA4-style abbreviations", () => {
    expect(compact(38723)).toBe("38.7K");
    expect(compact(25200)).toBe("25.2K");
    expect(compact(999)).toBe("999");
    expect(compact(4_400_000)).toBe("4.4M");
  });

  it("formatYearMonth turns 202601 into Jan 2026", () => {
    expect(formatYearMonth("202601")).toBe("Jan 2026");
    expect(formatYearMonth("202512")).toBe("Dec 2025");
  });

  it("previousPeriod is the same-length window immediately before", () => {
    // Jan 1..Jan 10 (10 days) -> Dec 22..Dec 31 of the prior period.
    expect(previousPeriod("2026-01-01", "2026-01-10")).toEqual({
      start: "2025-12-22",
      end: "2025-12-31",
    });
  });

  it("shiftYear moves back a calendar year", () => {
    expect(shiftYear("2026-09-23")).toBe("2025-09-23");
    expect(shiftYear("2026-01-01", -1)).toBe("2025-01-01");
    // Leap day clamps instead of producing an invalid date.
    expect(shiftYear("2024-02-29")).toBe("2023-02-28");
  });

  // 2026-09-24 is a Thursday.
  const T = "2026-09-24";
  it.each([
    ["today", "2026-09-24", "2026-09-24"],
    ["yesterday", "2026-09-23", "2026-09-23"],
    ["last7", "2026-09-17", "2026-09-23"],
    ["last28", "2026-08-27", "2026-09-23"],
    ["last30", "2026-08-25", "2026-09-23"],
    ["last90", "2026-06-26", "2026-09-23"],
    ["thisWeekSun", "2026-09-20", "2026-09-26"],
    ["thisWeekToDateSun", "2026-09-20", "2026-09-23"],
    ["thisWeekMon", "2026-09-21", "2026-09-27"],
    ["thisWeekToDateMon", "2026-09-21", "2026-09-23"],
    ["lastWeekSun", "2026-09-13", "2026-09-19"],
    ["lastWeekMon", "2026-09-14", "2026-09-20"],
    ["thisMonth", "2026-09-01", "2026-09-30"],
    ["thisMonthToDate", "2026-09-01", "2026-09-23"],
    ["lastMonth", "2026-08-01", "2026-08-31"],
    ["thisQuarter", "2026-07-01", "2026-09-30"],
    ["thisQuarterToDate", "2026-07-01", "2026-09-23"],
    ["lastQuarter", "2026-04-01", "2026-06-30"],
    ["thisYear", "2026-01-01", "2026-12-31"],
    ["thisYearToDate", "2026-01-01", "2026-09-23"],
    ["lastYear", "2025-01-01", "2025-12-31"],
  ] as const)("preset %s -> %s..%s", (preset, start, end) => {
    expect(presetRange(preset, T)).toEqual({ startDate: start, endDate: end });
  });

  it("presets cross year boundaries and handle a Sunday today", () => {
    expect(presetRange("lastMonth", "2026-01-15")).toEqual({ startDate: "2025-12-01", endDate: "2025-12-31" });
    expect(presetRange("lastQuarter", "2026-02-10")).toEqual({ startDate: "2025-10-01", endDate: "2025-12-31" });
    // 2026-09-20 is a Sunday.
    expect(presetRange("thisWeekSun", "2026-09-20")).toEqual({ startDate: "2026-09-20", endDate: "2026-09-26" });
    expect(presetRange("thisWeekMon", "2026-09-20")).toEqual({ startDate: "2026-09-14", endDate: "2026-09-20" });
    // To date on the period's first day: nothing before today, so just today.
    expect(presetRange("thisWeekToDateSun", "2026-09-20")).toEqual({ startDate: "2026-09-20", endDate: "2026-09-20" });
    expect(presetRange("custom", T)).toBeNull();
  });

  it("include today extends to-date and last-N ranges through today", () => {
    expect(presetRange("thisYearToDate", T, true)).toEqual({ startDate: "2026-01-01", endDate: "2026-09-24" });
    expect(presetRange("last7", T, true)).toEqual({ startDate: "2026-09-18", endDate: "2026-09-24" });
    // Whole periods and fixed past periods ignore it.
    expect(presetRange("thisMonth", T, true)).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30" });
    expect(presetRange("lastMonth", T, true)).toEqual({ startDate: "2026-08-01", endDate: "2026-08-31" });
  });

  it("comparisonRange picks previous period or previous year", () => {
    expect(comparisonRange("2026-01-01", "2026-01-10", "period")).toEqual({ start: "2025-12-22", end: "2025-12-31" });
    expect(comparisonRange("2026-01-01", "2026-01-10", "year")).toEqual({ start: "2025-01-01", end: "2025-01-10" });
  });

  it("shade maps value/max onto a light-to-dark green, neutral for none", () => {
    expect(shade(0, 100)).toBe("#eef2f1");
    expect(shade(5, 0)).toBe("#eef2f1");
    expect(shade(100, 100)).toBe("#0c7a65");
    // A quarter of max -> sqrt 0.5 -> halfway between the two ends.
    expect(shade(25, 100)).toBe("#73b8a9");
  });

  it("pivotDaily builds zero-filled rows with safe series keys", () => {
    const { data, series } = pivotDaily(
      [
        { date: "2026-01-02", series: "go.example.com", value: 5 },
        { date: "2026-01-01", series: "google", value: 3 },
        { date: "2026-01-01", series: "go.example.com", value: 2 },
        { date: "2026-01-01", series: "ignored", value: 99 },
      ],
      ["google", "go.example.com"]
    );
    expect(series).toEqual([
      { key: "s0", label: "google" },
      { key: "s1", label: "go.example.com" },
    ]);
    // Sorted by date, every series present, unknown series dropped.
    expect(data).toEqual([
      { date: "2026-01-01", s0: 3, s1: 2 },
      { date: "2026-01-02", s0: 0, s1: 5 },
    ]);
  });
});

describe("breakdown metrics", () => {
  it("parses known metrics and falls back otherwise", async () => {
    const { parseBreakdownMetric, metricLabel } = await import("@/lib/report");
    expect(parseBreakdownMetric("keyEvents", "totalUsers")).toBe("keyEvents");
    expect(parseBreakdownMetric("bogus", "totalUsers")).toBe("totalUsers");
    expect(parseBreakdownMetric(null, "newUsers")).toBe("newUsers");
    expect(metricLabel("engagedSessions")).toBe("Engaged sessions");
  });
});
