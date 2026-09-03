// Classical multiplicative seasonal decomposition for a daily series with a
// weekly period. We estimate one factor per day-of-week (Sun..Sat), normalized
// to average 1.0, then divide each observation by its factor to deseasonalize.
//
// Multiplicative (not additive) because web traffic swings proportionally: a
// weekend runs at ~40% of a weekday whether the site does 100 or 100,000
// sessions a day. The trend is a centered 7-day moving average, which cancels
// the weekly cycle so the ratio observation/trend isolates the day-of-week
// effect. Medians of those ratios resist one freak day.

import type { Point } from "./types";
import { median } from "./stats";
import { weekdayOf } from "./dates";
import { INDICATOR_CONFIG } from "./config";

export type SeasonalResult = {
  insufficientHistory: boolean;
  // Multiplicative factor per weekday index 0..6 (Sun..Sat), averaging 1.0.
  factors: number[];
  // Deseasonalized series aligned to the input, same length/order.
  deseasonalized: Point[];
};

/** Centered 7-day moving average; edges (first/last 3) are null. */
function centeredWeeklyTrend(values: number[]): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  for (let i = 3; i < values.length - 3; i++) {
    let sum = 0;
    for (let j = i - 3; j <= i + 3; j++) sum += values[j];
    out[i] = sum / 7;
  }
  return out;
}

export function seasonalAdjust(series: Point[]): SeasonalResult {
  const n = series.length;
  if (n < INDICATOR_CONFIG.minHistoryDays) {
    return { insufficientHistory: true, factors: [], deseasonalized: [] };
  }

  const values = series.map((p) => p.value);
  const trend = centeredWeeklyTrend(values);

  // Collect observation/trend ratios bucketed by weekday.
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < n; i++) {
    const t = trend[i];
    if (t == null || t === 0) continue;
    const wd = weekdayOf(series[i].date);
    buckets[wd].push(values[i] / t);
  }

  const raw = buckets.map((b) => (b.length ? median(b) : 1));
  // Normalize so the seven factors average exactly 1.0; a deseasonalized series
  // then has the same overall level as the original.
  const avg = raw.reduce((s, v) => s + v, 0) / 7;
  const factors = avg > 0 ? raw.map((f) => f / avg) : raw.map(() => 1);

  const deseasonalized: Point[] = series.map((p) => {
    const f = factors[weekdayOf(p.date)] || 1;
    return { date: p.date, value: f > 0 ? p.value / f : p.value };
  });

  return { insufficientHistory: false, factors, deseasonalized };
}
