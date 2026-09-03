import { describe, it, expect } from "vitest";
import { seasonalAdjust } from "@/lib/indicators/seasonal";
import type { Point } from "@/lib/indicators/types";
import { addDays, weekdayOf } from "@/lib/indicators/dates";

// Weekday = 1000, weekend (Sat/Sun) = 400, for a known 5:2 weekly shape.
function seasonalValue(iso: string): number {
  const wd = weekdayOf(iso);
  return wd === 0 || wd === 6 ? 400 : 1000;
}

function buildSeries(start: string, days: number): Point[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(start, i);
    return { date, value: seasonalValue(date) };
  });
}

describe("multiplicative seasonal decomposition", () => {
  it("under 56 days reports insufficient history", () => {
    const res = seasonalAdjust(buildSeries("2026-01-01", 40));
    expect(res.insufficientHistory).toBe(true);
    expect(res.deseasonalized).toEqual([]);
  });

  it("factors average to 1.0 and reflect the weekend dip", () => {
    const res = seasonalAdjust(buildSeries("2026-01-01", 120));
    expect(res.insufficientHistory).toBe(false);
    const avg = res.factors.reduce((s, v) => s + v, 0) / 7;
    expect(avg).toBeCloseTo(1, 6);
    // Weekend factors (index 0=Sun, 6=Sat) sit well below weekday factors.
    expect(res.factors[0]).toBeLessThan(res.factors[3]);
    expect(res.factors[6]).toBeLessThan(res.factors[3]);
  });

  it("deseasonalizing a purely seasonal series flattens it", () => {
    const res = seasonalAdjust(buildSeries("2026-01-01", 120));
    // Ignore the trend-MA edges; the interior should be near constant.
    const interior = res.deseasonalized.slice(10, -10).map((p) => p.value);
    const min = Math.min(...interior);
    const max = Math.max(...interior);
    // Weekday 1000 and weekend 400 collapse to the same deseasonalized level.
    expect((max - min) / max).toBeLessThan(0.02);
  });
});
