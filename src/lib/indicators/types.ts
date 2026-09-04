// Shared types for the indicator engine. Everything operates on a daily series
// of { date, value } for one metric. Pure data, no framework.

export type Point = { date: string; value: number };

export type MetricKind = "count" | "rate";

export type SignalDirection = "up" | "down";

export type Signal = {
  date: string;
  direction: SignalDirection;
  baselineMean?: number;
  baselineSd?: number;
  cusumValue?: number;
};

// A per-day control band: lower/upper bounds around an expected center.
export type Band = {
  date: string;
  lower: number;
  center: number;
  upper: number;
};

export type Candle = {
  // ISO week key, e.g. "2026-W07".
  week: string;
  // The Monday of the ISO week as "yyyy-mm-dd" (lightweight-charts time).
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Crossover = { date: string; direction: SignalDirection };

// For rate metrics: the raw counts behind each day's proportion, used to build a
// Wilson score band that widens on low-volume days.
export type RateSample = { date: string; successes: number; trials: number };

// Per-panel empty-state flags. Each indicator can render exactly one explicit
// empty state instead of a misleading chart.
export type IndicatorFlags = {
  insufficientHistory: boolean;
  insufficientVolume: boolean;
  noSignals: boolean;
};

// One CUSUM point for the detector pane.
export type CusumSeriesPoint = { date: string; cplus: number; cminus: number };

// The full result the engine hands the UI for one metric.
export type IndicatorPayload = {
  metric: string;
  kind: MetricKind;
  flags: IndicatorFlags;
  // Raw daily series (before deseasonalization), so the chart can re-aggregate
  // to daily / weekly / monthly on demand.
  daily: Point[];
  // Daily deseasonalized series and its control band (count metrics use a CUSUM
  // baseline band; rate metrics use Wilson intervals).
  deseasonalized: Point[];
  controlBand: Band[];
  // CUSUM detector series and its decision threshold.
  cusum: CusumSeriesPoint[];
  cusumThreshold: number;
  // Weekly candles with fast/slow SMA overlays and their crossovers.
  candles: Candle[];
  smaFast: (number | null)[];
  smaSlow: (number | null)[];
  crossovers: Crossover[];
  // Fired change-point signals, newest last.
  signals: Signal[];
  // Days on or after this date are provisional (GA4 still restating them).
  provisionalFromDate: string | null;
};
