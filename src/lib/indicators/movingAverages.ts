// Simple and exponential moving averages over a WEEKLY candle close series, plus
// the crossovers between a fast and a slow line. These are trend-following only:
// a fast average crossing above a slow one marks a sustained rise, crossing
// below a sustained fall. No oscillators, no mean-reversion premise.
//
// Windows are given in weeks (candles are already weekly), so no multiple-of-7
// juggling is needed here; the weekly aggregation did that.

import type { Candle, Crossover, SignalDirection } from "./types";

/** Trailing simple moving average; entries before the window fills are null. */
export function sma(values: number[], window: number): (number | null)[] {
  if (window <= 0) throw new Error(`sma window must be positive, got ${window}`);
  const out: (number | null)[] = values.map(() => null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= window) sum -= values[i - window];
    if (i >= window - 1) out[i] = sum / window;
  }
  return out;
}

/** Exponential moving average seeded with the first value. */
export function ema(values: number[], window: number): (number | null)[] {
  if (window <= 0) throw new Error(`ema window must be positive, got ${window}`);
  const out: (number | null)[] = values.map(() => null);
  if (values.length === 0) return out;
  const alpha = 2 / (window + 1);
  let prev = values[0];
  out[0] = prev;
  for (let i = 1; i < values.length; i++) {
    prev = alpha * values[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

/**
 * Crossovers of a fast line over a slow line. "up" when fast rises above slow,
 * "down" when it falls below. Only points where both lines are defined and the
 * previous point had both defined are considered.
 */
export function crossovers(
  candles: Candle[],
  fast: (number | null)[],
  slow: (number | null)[]
): Crossover[] {
  const out: Crossover[] = [];
  for (let i = 1; i < candles.length; i++) {
    const f0 = fast[i - 1];
    const s0 = slow[i - 1];
    const f1 = fast[i];
    const s1 = slow[i];
    if (f0 == null || s0 == null || f1 == null || s1 == null) continue;
    const wasBelow = f0 <= s0;
    const nowAbove = f1 > s1;
    if (wasBelow && nowAbove) {
      out.push({ date: candles[i].time, direction: "up" as SignalDirection });
    } else if (!wasBelow && !nowAbove && f1 < s1) {
      out.push({ date: candles[i].time, direction: "down" as SignalDirection });
    }
  }
  return out;
}
