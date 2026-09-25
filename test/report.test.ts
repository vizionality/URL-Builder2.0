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
