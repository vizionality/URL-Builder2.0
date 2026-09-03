import { describe, it, expect } from "vitest";
import {
  median,
  pctChange,
  parseGa4Date,
  toGa4Date,
  addDays,
  weekdayOf,
  targetDate,
  baselineDates,
  windowStart,
} from "@/lib/health/baseline";

describe("median", () => {
  it("odd and even lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
  it("empty is NaN and callers can guard", () => {
    expect(Number.isNaN(median([]))).toBe(true);
  });
  it("survives one freak day (median, not mean)", () => {
    // one 10000 spike in an otherwise ~1000 window barely moves the median
    expect(median([1000, 1000, 1000, 10000])).toBe(1000);
  });
});

describe("pctChange", () => {
  it("signed change", () => {
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(150, 100)).toBe(50);
  });
  it("zero baseline", () => {
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(5, 0)).toBe(Infinity);
  });
});

describe("GA4 date normalization", () => {
  it("yyyymmdd -> yyyy-mm-dd and back", () => {
    expect(parseGa4Date("20260101")).toBe("2026-01-01");
    expect(parseGa4Date("20261231")).toBe("2026-12-31");
    expect(toGa4Date("2026-01-01")).toBe("20260101");
  });
  it("rejects malformed input", () => {
    expect(() => parseGa4Date("2026-01-01")).toThrow();
    expect(() => parseGa4Date("badvalue")).toThrow();
  });
});

describe("date arithmetic across boundaries", () => {
  it("crosses a month boundary", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("crosses the US spring-forward DST transition without shifting weekday", () => {
    // US DST 2026 begins Sunday March 8. Adding 7 days over it in UTC must land
    // on the same weekday and the correct calendar date.
    expect(addDays("2026-03-07", 7)).toBe("2026-03-14");
    expect(weekdayOf("2026-03-07")).toBe(6); // Saturday
    expect(weekdayOf("2026-03-14")).toBe(6); // still Saturday
  });
});

describe("baseline date generation", () => {
  it("targetDate applies the lag", () => {
    expect(targetDate("2026-03-16", 2)).toBe("2026-03-14");
  });

  it("same weekday for the previous N weeks, across a month boundary", () => {
    // Target Sat 2026-03-07; previous 4 Saturdays cross into February.
    const dates = baselineDates("2026-03-07", 4);
    expect(dates).toEqual([
      "2026-02-28",
      "2026-02-21",
      "2026-02-14",
      "2026-02-07",
    ]);
    for (const d of dates) expect(weekdayOf(d)).toBe(6);
  });

  it("baseline dates spanning the DST transition stay the same weekday", () => {
    // Target Sat 2026-03-14; window reaches back over March 8 DST change.
    const dates = baselineDates("2026-03-14", 4);
    expect(dates).toEqual([
      "2026-03-07",
      "2026-02-28",
      "2026-02-21",
      "2026-02-14",
    ]);
    for (const d of dates) expect(weekdayOf(d)).toBe(6);
  });

  it("windowStart is the earliest baseline date", () => {
    expect(windowStart("2026-03-14", 4)).toBe("2026-02-14");
  });
});
