// Tunable constants for the indicator engine, in one place so the tests and the
// UI reference the same numbers. All windows are in days and are multiples of 7
// so weekly seasonality lines up.

export const INDICATOR_CONFIG = {
  // Deseasonalization needs at least this many days to estimate 7 day-of-week
  // factors with any stability. Below it, panels render "insufficient history".
  minHistoryDays: 56,

  // CUSUM baseline is a lagged window ending before the target so a slow drift
  // does not contaminate its own baseline. Offsets are measured back from the
  // day being scored.
  cusumBaselineLagDays: 28, // baseline ends this many days before the point
  cusumBaselineSpanDays: 28, // and spans this many days (so t-56 .. t-28)

  // Tabular CUSUM parameters, in units of baseline standard deviations.
  cusumK: 0.5, // slack: half a sigma of drift is tolerated
  cusumH: 5, // decision threshold: fire when the sum exceeds 5 sigma

  // Count metrics below this baseline mean are too sparse for a stable CUSUM;
  // the panel renders "insufficient volume" instead of firing on noise.
  minBaselineMeanForCount: 30,

  // Wilson score interval z for a 95% two-sided band on rate metrics.
  wilsonZ: 1.96,

  // Weekly candle moving averages, in weeks.
  smaFastWeeks: 4,
  smaSlowWeeks: 12,

  // GA4 restates the most recent days for hours; treat the last two as
  // provisional so a signal is never fired on numbers still settling.
  provisionalTailDays: 2,
} as const;
