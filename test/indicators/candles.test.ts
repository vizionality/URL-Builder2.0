import { describe, it, expect } from "vitest";
import { weeklyCandles, periodCandles } from "@/lib/indicators/candles";
import { sma, ema, crossovers } from "@/lib/indicators/movingAverages";
import type { Point } from "@/lib/indicators/types";
import { addDays } from "@/lib/indicators/dates";

function seriesFrom(start: string, values: number[]): Point[] {
  return values.map((value, i) => ({ date: addDays(start, i), value }));
}

describe("weekly OHLC candles", () => {
  it("builds one candle per full week with correct OHLC", () => {
    // Start on a Monday (2026-03-16). One full week: 10,20,5,15,25,8,12.
    const week1 = [10, 20, 5, 15, 25, 8, 12];
    const candles = weeklyCandles(seriesFrom("2026-03-16", week1));
    expect(candles).toHaveLength(1);
    expect(candles[0].open).toBe(10);
    expect(candles[0].close).toBe(12);
    expect(candles[0].high).toBe(25);
    expect(candles[0].low).toBe(5);
    expect(candles[0].time).toBe("2026-03-16");
  });

  it("drops a partial trailing week", () => {
    // 7 full days + 3 extra of the next week -> still only one candle.
    const values = [10, 20, 5, 15, 25, 8, 12, 30, 31, 32];
    const candles = weeklyCandles(seriesFrom("2026-03-16", values));
    expect(candles).toHaveLength(1);
  });
});

describe("periodCandles", () => {
  it("aggregates monthly OHLC and drops the in-progress final month", () => {
    // All of January (complete) plus a few days of February (in progress).
    const jan: Point[] = Array.from({ length: 31 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      value: i + 1, // 1..31
    }));
    const feb: Point[] = [
      { date: "2026-02-01", value: 100 },
      { date: "2026-02-02", value: 200 },
    ];
    const candles = periodCandles([...jan, ...feb], "month");
    expect(candles).toHaveLength(1); // Feb dropped (month not finished)
    expect(candles[0].time).toBe("2026-01-01");
    expect(candles[0].open).toBe(1);
    expect(candles[0].close).toBe(31);
    expect(candles[0].high).toBe(31);
    expect(candles[0].low).toBe(1);
  });

  it("keeps a completed final month", () => {
    const jan: Point[] = Array.from({ length: 31 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      value: 10,
    }));
    // Data ends on Jan 31 (month complete), so the January candle is kept.
    expect(periodCandles(jan, "month")).toHaveLength(1);
  });

  it("weekly period drops an unfinished trailing week", () => {
    // Two full ISO weeks (Mon 2026-03-02 .. Sun 2026-03-15) plus one extra Monday.
    const days: Point[] = Array.from({ length: 15 }, (_, i) => ({
      date: `2026-03-${String(i + 2).padStart(2, "0")}`,
      value: i,
    }));
    const candles = periodCandles(days, "week");
    expect(candles).toHaveLength(2); // the lone Monday's week is in progress
  });
});

describe("moving averages and crossovers", () => {
  it("sma is null until the window fills, then trailing mean", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull();
    expect(out[2]).toBe(2); // (1+2+3)/3
    expect(out[3]).toBe(3); // (2+3+4)/3
    expect(out[4]).toBe(4); // (3+4+5)/3
  });

  it("ema is seeded with the first value and tracks upward", () => {
    const out = ema([10, 10, 10, 20], 3);
    expect(out[0]).toBe(10);
    expect(out[3]!).toBeGreaterThan(10);
    expect(out[3]!).toBeLessThan(20);
  });

  it("sma/ema reject non-positive windows", () => {
    expect(() => sma([1, 2], 0)).toThrow();
    expect(() => ema([1, 2], -1)).toThrow();
  });

  it("crossover fires up when fast rises above slow", () => {
    // Four weekly candles; fast crosses above slow between index 2 and 3.
    const candles = weeklyCandles(
      seriesFrom("2026-03-16", new Array(28).fill(0).map((_, i) => i))
    );
    const closes = candles.map((c) => c.close);
    const fast = sma(closes, 1); // fast = the close itself
    const slow = [10, 10, 10, 5]; // manufactured slow line
    const cross = crossovers(candles, fast, slow);
    expect(cross.some((c) => c.direction === "up")).toBe(true);
  });
});
