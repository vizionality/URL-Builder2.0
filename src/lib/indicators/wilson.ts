// Wilson score interval for a binomial proportion. Rate metrics (conversion
// rate = key events / sessions) are proportions, and a naive normal interval
// misbehaves near 0, near 1, and at low sample sizes. The Wilson interval stays
// inside [0, 1] and stays sensible when trials are small, which is exactly the
// regime a low-traffic day lands in.

import { INDICATOR_CONFIG } from "./config";

export type WilsonInterval = { lower: number; center: number; upper: number };

export function wilsonInterval(
  successes: number,
  trials: number,
  z: number = INDICATOR_CONFIG.wilsonZ
): WilsonInterval {
  if (trials <= 0) return { lower: 0, center: 0, upper: 0 };

  const p = successes / trials;
  const z2 = z * z;
  const denom = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denom;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denom;

  return {
    lower: Math.max(0, center - margin),
    center,
    upper: Math.min(1, center + margin),
  };
}
