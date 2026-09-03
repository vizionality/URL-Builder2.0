import { describe, it, expect } from "vitest";
import {
  addDays,
  daysBetween,
  weekdayOf,
  isoWeekMonday,
  isoWeekKey,
  parseGa4Date,
  toGa4Date,
} from "@/lib/indicators/dates";

describe("date helpers (UTC)", () => {
  it("addDays crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2026-03-16", 7)).toBe("2026-03-23");
  });

  it("daysBetween is signed and symmetric", () => {
    expect(daysBetween("2026-03-01", "2026-03-16")).toBe(15);
    expect(daysBetween("2026-03-16", "2026-03-01")).toBe(-15);
  });

  it("weekdayOf: 0=Sunday..6=Saturday", () => {
    expect(weekdayOf("2026-03-15")).toBe(0); // Sunday
    expect(weekdayOf("2026-03-16")).toBe(1); // Monday
    expect(weekdayOf("2026-03-21")).toBe(6); // Saturday
  });

  it("isoWeekMonday snaps any day to its Monday", () => {
    // 2026-03-18 is a Wednesday; its Monday is 2026-03-16.
    expect(isoWeekMonday("2026-03-18")).toBe("2026-03-16");
    expect(isoWeekMonday("2026-03-16")).toBe("2026-03-16");
    // Sunday belongs to the week that started the previous Monday.
    expect(isoWeekMonday("2026-03-15")).toBe("2026-03-09");
  });

  it("isoWeekKey matches known ISO week numbers", () => {
    // 2026-01-01 is a Thursday, so it is in ISO week 1 of 2026.
    expect(isoWeekKey("2026-01-01")).toBe("2026-W01");
    // 2026-03-16 (Mon) is ISO week 12.
    expect(isoWeekKey("2026-03-16")).toBe("2026-W12");
  });

  it("GA4 date round-trips", () => {
    expect(parseGa4Date("20260316")).toBe("2026-03-16");
    expect(toGa4Date("2026-03-16")).toBe("20260316");
    expect(() => parseGa4Date("2026-03-16")).toThrow(/yyyymmdd/i);
  });
});
