// Two-sided tabular CUSUM change detector on a deseasonalized daily series.
//
// A CUSUM accumulates how far each point sits above (or below) an expected mean,
// minus a slack k. It stays near zero under normal noise and climbs steadily
// once the true level shifts, so it catches a sustained step long before a
// single-day threshold would. We use a LAGGED baseline (a window ending well
// before the point being scored) so a slow drift does not quietly raise its own
// baseline and hide itself.
//
// Cplus detects upward shifts, Cminus downward. Both reset to zero on the day
// they fire so a run of flagged days does not smear into one endless signal.

import type { Point, Signal } from "./types";
import { mean, stddev } from "./stats";
import { INDICATOR_CONFIG } from "./config";

export type CusumPoint = {
  date: string;
  cplus: number;
  cminus: number;
};

export type CusumResult = {
  insufficientHistory: boolean;
  insufficientVolume: boolean;
  h: number; // decision threshold in the series' own units
  points: CusumPoint[];
  signals: Signal[];
};

const { cusumBaselineLagDays, cusumBaselineSpanDays, cusumK, cusumH } =
  INDICATOR_CONFIG;

// Days needed before the first scorable point: the full lagged baseline window.
const MIN_LEAD = cusumBaselineLagDays + cusumBaselineSpanDays;

export function runCusum(
  series: Point[],
  opts: { isCount: boolean } = { isCount: false }
): CusumResult {
  const n = series.length;
  if (n <= MIN_LEAD) {
    return {
      insufficientHistory: true,
      insufficientVolume: false,
      h: 0,
      points: [],
      signals: [],
    };
  }

  const values = series.map((p) => p.value);
  const points: CusumPoint[] = [];
  const signals: Signal[] = [];

  let cplus = 0;
  let cminus = 0;
  let sawUsableBaseline = false;
  let sawVolume = false;
  let lastH = 0; // most recent decision threshold, for the display reference line

  // Score every point that has a full lagged baseline behind it.
  for (let i = MIN_LEAD; i < n; i++) {
    // Baseline window: [i - lag - span, i - lag).
    const start = i - cusumBaselineLagDays - cusumBaselineSpanDays;
    const end = i - cusumBaselineLagDays;
    const baseline = values.slice(start, end);
    const mu = mean(baseline);
    let sd = stddev(baseline);

    // A degenerate flat baseline (sd 0) would make every wiggle infinite; fall
    // back to a Poisson-ish sqrt(mu) floor for counts, else skip scoring.
    if (sd === 0) sd = opts.isCount && mu > 0 ? Math.sqrt(mu) : 0;

    // Count metrics with too small a baseline mean are pure noise: do not fire.
    if (opts.isCount && mu < INDICATOR_CONFIG.minBaselineMeanForCount) {
      cplus = 0;
      cminus = 0;
      points.push({ date: series[i].date, cplus: 0, cminus: 0 });
      continue;
    }
    sawVolume = true;

    if (sd === 0) {
      points.push({ date: series[i].date, cplus, cminus });
      continue;
    }
    sawUsableBaseline = true;

    const k = cusumK * sd;
    const x = values[i];
    cplus = Math.max(0, cplus + (x - mu) - k);
    cminus = Math.max(0, cminus - (x - mu) - k);

    const h = cusumH * sd;
    lastH = h;
    const date = series[i].date;

    if (cplus > h) {
      signals.push({
        date,
        direction: "up",
        baselineMean: mu,
        baselineSd: sd,
        cusumValue: cplus,
      });
      cplus = 0; // reset so consecutive days do not each re-fire
    } else if (cminus > h) {
      signals.push({
        date,
        direction: "down",
        baselineMean: mu,
        baselineSd: sd,
        cusumValue: cminus,
      });
      cminus = 0;
    }

    points.push({ date, cplus, cminus });
  }

  return {
    insufficientHistory: false,
    insufficientVolume: !sawVolume && !sawUsableBaseline,
    h: lastH,
    points,
    signals,
  };
}
