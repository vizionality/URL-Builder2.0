import { describe, it, expect } from "vitest";
import { runCusum } from "@/lib/indicators/cusum";
import type { Point } from "@/lib/indicators/types";
import { addDays } from "@/lib/indicators/dates";

// Build a consecutive daily series from a start date.
function seriesFrom(start: string, values: number[]): Point[] {
  return values.map((value, i) => ({ date: addDays(start, i), value }));
}

describe("tabular CUSUM change detection", () => {
  it("flat series fires no signal", () => {
    const values = Array.from({ length: 120 }, () => 100);
    const res = runCusum(seriesFrom("2026-01-01", values), { isCount: true });
    expect(res.insufficientHistory).toBe(false);
    expect(res.signals).toEqual([]);
  });

  it("detects an injected upward step within the expected number of days", () => {
    // 120 days at 100, with a step up to 130 injected on day index 70. The
    // baseline is flat (sd 0) so counts fall back to a sqrt(mu)=10 sigma:
    // k = 0.5*10 = 5, h = 5*10 = 50. Each post-step day adds (130-100)-5 = 25,
    // so cplus reaches 25, 50, 75 and crosses h on the THIRD day after the step.
    const values = Array.from({ length: 120 }, (_, i) => (i >= 70 ? 130 : 100));
    const start = "2026-01-01";
    const res = runCusum(seriesFrom(start, values), { isCount: true });

    expect(res.signals.length).toBeGreaterThanOrEqual(1);
    const first = res.signals[0];
    expect(first.direction).toBe("up");

    const stepDate = addDays(start, 70);
    // Fires within 5 days of the injected step (hand-computed: exactly 3rd day).
    const daysAfterStep =
      (new Date(first.date).getTime() - new Date(stepDate).getTime()) / 86_400_000;
    expect(daysAfterStep).toBeGreaterThanOrEqual(0);
    expect(daysAfterStep).toBeLessThanOrEqual(5);
    expect(first.date).toBe(addDays(start, 72));

    expect(first.baselineMean).toBeCloseTo(100, 6);
  });

  it("detects an injected downward step", () => {
    const values = Array.from({ length: 120 }, (_, i) => (i >= 70 ? 70 : 100));
    const res = runCusum(seriesFrom("2026-01-01", values), { isCount: true });
    expect(res.signals.length).toBeGreaterThanOrEqual(1);
    expect(res.signals[0].direction).toBe("down");
  });

  it("resets after firing so one step yields one prompt signal, not a smear", () => {
    const values = Array.from({ length: 120 }, (_, i) => (i >= 70 ? 130 : 100));
    const res = runCusum(seriesFrom("2026-01-01", values), { isCount: true });
    // The day immediately after the first fire must not itself be a fired day
    // (cplus was reset to 0), even though the level is still elevated.
    const firstDate = res.signals[0].date;
    const nextDay = addDays(firstDate, 1);
    expect(res.signals.some((s) => s.date === nextDay)).toBe(false);
  });

  it("low-volume count series fires nothing (insufficient volume floor)", () => {
    // Baseline mean ~5 is below minBaselineMeanForCount (30): even a doubling
    // is treated as noise and never fires.
    const values = Array.from({ length: 120 }, (_, i) => (i >= 70 ? 10 : 5));
    const res = runCusum(seriesFrom("2026-01-01", values), { isCount: true });
    expect(res.signals).toEqual([]);
  });

  it("too-short series reports insufficient history", () => {
    const values = Array.from({ length: 40 }, () => 100);
    const res = runCusum(seriesFrom("2026-01-01", values), { isCount: true });
    expect(res.insufficientHistory).toBe(true);
  });
});
