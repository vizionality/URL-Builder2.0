// Weekly OHLC candles from a daily series. Open is the first day's value of the
// ISO week, close the last, high/low the extremes. Partial weeks at either end
// (fewer than 7 days present) are dropped so a candle never misreads a week that
// GA4 has only partly filled.

import type { Point, Candle } from "./types";
import { isoWeekKey, isoWeekMonday, addDays } from "./dates";

export type CandlePeriod = "week" | "month";

// Last calendar day of the month containing an ISO date, as "yyyy-mm-dd".
function monthEnd(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${iso.slice(0, 7)}-${String(days).padStart(2, "0")}`;
}

// OHLC candles aggregated to a period. The most recent bucket is dropped when
// its period has not finished as of the last data point (so an in-progress week
// or month never renders as a misleading candle); earlier elapsed buckets are
// kept even if the data has gaps.
export function periodCandles(series: Point[], period: CandlePeriod): Candle[] {
  if (series.length === 0) return [];
  const lastDate = series.reduce((mx, p) => (p.date > mx ? p.date : mx), series[0].date);

  const byKey = new Map<string, Point[]>();
  for (const p of series) {
    const key = period === "week" ? isoWeekKey(p.date) : p.date.slice(0, 7);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(p);
    else byKey.set(key, [p]);
  }

  const candles: Candle[] = [];
  for (const [key, points] of byKey) {
    const sorted = [...points].sort((a, b) => (a.date < b.date ? -1 : 1));
    const first = sorted[0].date;
    const periodEnd = period === "week" ? addDays(isoWeekMonday(first), 6) : monthEnd(first);
    if (periodEnd > lastDate) continue; // in-progress period, drop it
    const values = sorted.map((p) => p.value);
    candles.push({
      week: key,
      time: period === "week" ? isoWeekMonday(first) : `${key}-01`,
      open: values[0],
      high: Math.max(...values),
      low: Math.min(...values),
      close: values[values.length - 1],
    });
  }
  candles.sort((a, b) => (a.time < b.time ? -1 : 1));
  return candles;
}

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
