// Weekly OHLC candles from a daily series. Open is the first day's value of the
// ISO week, close the last, high/low the extremes. Partial weeks at either end
// (fewer than 7 days present) are dropped so a candle never misreads a week that
// GA4 has only partly filled.

import type { Point, Candle } from "./types";
import { isoWeekKey, isoWeekMonday } from "./dates";

export function weeklyCandles(series: Point[]): Candle[] {
  const byWeek = new Map<string, Point[]>();
  for (const p of series) {
    const key = isoWeekKey(p.date);
    const bucket = byWeek.get(key);
    if (bucket) bucket.push(p);
    else byWeek.set(key, [p]);
  }

  const candles: Candle[] = [];
  for (const [week, points] of byWeek) {
    if (points.length < 7) continue; // drop partial weeks
    const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1));
    const values = sorted.map((p) => p.value);
    candles.push({
      week,
      time: isoWeekMonday(sorted[0].date),
      open: values[0],
      high: Math.max(...values),
      low: Math.min(...values),
      close: values[values.length - 1],
    });
  }

  candles.sort((a, b) => (a.time < b.time ? -1 : 1));
  return candles;
}
