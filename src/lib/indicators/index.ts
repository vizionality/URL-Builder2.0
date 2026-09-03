// Orchestrator: turn one daily metric series into everything the signals UI
// needs. Pure and deterministic, so the same input always yields the same
// payload and the whole thing is unit-testable without GA4.

import type {
  Point,
  MetricKind,
  Band,
  IndicatorPayload,
  RateSample,
} from "./types";
import { seasonalAdjust } from "./seasonal";
import { runCusum } from "./cusum";
import { wilsonInterval } from "./wilson";
import { weeklyCandles } from "./candles";
import { sma, crossovers } from "./movingAverages";
import { mean, stddev } from "./stats";
import { addDays } from "./dates";
import { INDICATOR_CONFIG } from "./config";

export * from "./types";
export { INDICATOR_CONFIG } from "./config";

const { smaFastWeeks, smaSlowWeeks, wilsonZ, provisionalTailDays } =
  INDICATOR_CONFIG;

// A lagged control band around the deseasonalized series for count metrics:
// mean +/- 3 sd of the same trailing baseline the CUSUM uses, so the band and
// the detector tell a consistent story.
function countControlBand(deseasonalized: Point[]): Band[] {
  const values = deseasonalized.map((p) => p.value);
  const lag = INDICATOR_CONFIG.cusumBaselineLagDays;
  const span = INDICATOR_CONFIG.cusumBaselineSpanDays;
  const lead = lag + span;
  const out: Band[] = [];
  for (let i = 0; i < deseasonalized.length; i++) {
    if (i <= lead) continue;
    const baseline = values.slice(i - lag - span, i - lag);
    const mu = mean(baseline);
    const sd = stddev(baseline);
    out.push({
      date: deseasonalized[i].date,
      lower: Math.max(0, mu - 3 * sd),
      center: mu,
      upper: mu + 3 * sd,
    });
  }
  return out;
}

// Wilson band for a rate metric, per day, from that day's successes/trials.
function rateControlBand(samples: RateSample[]): Band[] {
  return samples.map((s) => {
    const w = wilsonInterval(s.successes, s.trials, wilsonZ);
    return { date: s.date, lower: w.lower, center: w.center, upper: w.upper };
  });
}

function provisionalFrom(series: Point[]): string | null {
  if (series.length === 0) return null;
  const last = series[series.length - 1].date;
  return addDays(last, -(provisionalTailDays - 1));
}

export type RunInput = {
  metric: string;
  kind: MetricKind;
  // Daily series of the metric's value (rate as a proportion 0..1 for rates).
  series: Point[];
  // For rate metrics only: the successes/trials behind each day, for Wilson.
  rateSamples?: RateSample[];
};

export function runIndicators(input: RunInput): IndicatorPayload {
  const { metric, kind, series } = input;
  const isCount = kind === "count";

  const seasonal = seasonalAdjust(series);
  const deseasonalized = seasonal.insufficientHistory
    ? []
    : seasonal.deseasonalized;

  const cusum = runCusum(isCount ? deseasonalized : series, { isCount });

  const controlBand = seasonal.insufficientHistory
    ? []
    : isCount
      ? countControlBand(deseasonalized)
      : rateControlBand(input.rateSamples ?? []);

  const candles = weeklyCandles(series);
  const closes = candles.map((c) => c.close);
  const smaFast = sma(closes, smaFastWeeks);
  const smaSlow = sma(closes, smaSlowWeeks);
  const cross = crossovers(candles, smaFast, smaSlow);

  const insufficientHistory =
    seasonal.insufficientHistory || cusum.insufficientHistory;
  const insufficientVolume = cusum.insufficientVolume;
  const noSignals =
    !insufficientHistory && !insufficientVolume && cusum.signals.length === 0;

  return {
    metric,
    kind,
    flags: { insufficientHistory, insufficientVolume, noSignals },
    deseasonalized,
    controlBand,
    cusum: cusum.points,
    cusumThreshold: cusum.h,
    candles,
    smaFast,
    smaSlow,
    crossovers: cross,
    signals: cusum.signals,
    provisionalFromDate: provisionalFrom(series),
  };
}
