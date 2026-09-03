import { describe, it, expect } from "vitest";
import { runIndicators } from "@/lib/indicators";
import type { Point, RateSample } from "@/lib/indicators/types";
import { addDays, weekdayOf } from "@/lib/indicators/dates";

function seriesFrom(start: string, values: number[]): Point[] {
  return values.map((value, i) => ({ date: addDays(start, i), value }));
}

describe("runIndicators orchestrator", () => {
  it("short history yields the insufficient-history empty state", () => {
    const payload = runIndicators({
      metric: "sessions",
      kind: "count",
      series: seriesFrom("2026-01-01", new Array(30).fill(100)),
    });
    expect(payload.flags.insufficientHistory).toBe(true);
    expect(payload.deseasonalized).toEqual([]);
  });

  it("a steady count series produces the no-signals empty state", () => {
    // Weekly seasonality present but no level change: nothing should fire.
    const values = Array.from({ length: 140 }, (_, i) => {
      const wd = weekdayOf(addDays("2026-01-01", i));
      return wd === 0 || wd === 6 ? 400 : 1000;
    });
    const payload = runIndicators({
      metric: "sessions",
      kind: "count",
      series: seriesFrom("2026-01-01", values),
    });
    expect(payload.flags.insufficientHistory).toBe(false);
    expect(payload.flags.noSignals).toBe(true);
    expect(payload.signals).toEqual([]);
  });

  it("a count series with an injected step fires a signal and clears noSignals", () => {
    const values = Array.from({ length: 140 }, (_, i) => {
      const wd = weekdayOf(addDays("2026-01-01", i));
      const base = wd === 0 || wd === 6 ? 400 : 1000;
      return i >= 90 ? base + 600 : base; // sustained level jump
    });
    const payload = runIndicators({
      metric: "sessions",
      kind: "count",
      series: seriesFrom("2026-01-01", values),
    });
    expect(payload.signals.length).toBeGreaterThanOrEqual(1);
    expect(payload.flags.noSignals).toBe(false);
  });

  it("rate metric builds a Wilson control band from samples", () => {
    const n = 140;
    const series: Point[] = [];
    const rateSamples: RateSample[] = [];
    for (let i = 0; i < n; i++) {
      const date = addDays("2026-01-01", i);
      const trials = 1000;
      const successes = 100; // 10% conversion
      series.push({ date, value: successes / trials });
      rateSamples.push({ date, successes, trials });
    }
    const payload = runIndicators({
      metric: "conversionRate",
      kind: "rate",
      series,
      rateSamples,
    });
    expect(payload.controlBand.length).toBe(n);
    const band = payload.controlBand[0];
    expect(band.lower).toBeLessThan(band.center);
    expect(band.upper).toBeGreaterThan(band.center);
    expect(band.center).toBeGreaterThan(0.08);
    expect(band.center).toBeLessThan(0.12);
  });

  it("marks the last two days provisional", () => {
    const values = new Array(140).fill(100);
    const payload = runIndicators({
      metric: "sessions",
      kind: "count",
      series: seriesFrom("2026-01-01", values),
    });
    expect(payload.provisionalFromDate).toBe(addDays("2026-01-01", 139 - 1));
  });
});
