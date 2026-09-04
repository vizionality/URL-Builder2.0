// Screener: run the indicator engine across many dimension values (campaigns,
// sources, mediums, landing pages) and return the ones that just triggered a
// condition. This is the TC2000 "scan" for marketing, built on the same engine
// as Signals. Pure and deterministic, so it is unit-testable without GA4.

import type { Point, SignalDirection } from "./types";
import { runIndicators } from "./index";
import { addDays } from "./dates";

export type ScreenCondition = "cusum" | "pctBaseline" | "crossover";

export type ScreenConfig = {
  conditions: ScreenCondition[];
  withinDays: number; // CUSUM signal recency window
  thresholdPct: number; // percent off baseline for pctBaseline
  withinBars: number; // crossover recency, in weekly candles
  minVolume: number; // volume floor on the total metric per value
};

export const SCREEN_DEFAULTS: ScreenConfig = {
  conditions: ["cusum", "pctBaseline", "crossover"],
  withinDays: 14,
  thresholdPct: 25,
  withinBars: 4,
  minVolume: 50,
};

export type ScreenItem = { value: string; series: Point[]; total: number };

export type MatchedSignal = {
  type: ScreenCondition;
  direction: SignalDirection;
  date: string;
};

export type ScreenHit = {
  value: string;
  latest: number;
  baseline: number | null;
  pctChange: number | null;
  matched: MatchedSignal[];
  sparkline: number[];
  score: number;
};

export type ScreenResult = {
  hits: ScreenHit[];
  scanned: number;
  skippedVolume: number;
};

function lastDateOf(series: Point[]): string {
  return series.reduce((mx, p) => (p.date > mx ? p.date : mx), series[0].date);
}

// Scan one item under the enabled conditions; returns null if it matches none.
function scanItem(item: ScreenItem, config: ScreenConfig): ScreenHit | null {
  const { series } = item;
  if (series.length === 0) return null;

  const run = runIndicators({ metric: item.value, kind: "count", series });
  const last = lastDateOf(series);
  const latest = series[series.length - 1].value;

  // Baseline for the percent check: the control band center on the latest day.
  const band = run.controlBand.length ? run.controlBand[run.controlBand.length - 1] : null;
  const baseline = band ? band.center : null;
  const pctChange =
    baseline && baseline > 0 ? ((latest - baseline) / baseline) * 100 : null;

  const matched: MatchedSignal[] = [];

  if (config.conditions.includes("cusum") && !run.flags.insufficientHistory) {
    const cutoff = addDays(last, -config.withinDays);
    for (const s of run.signals) {
      if (s.date >= cutoff) {
        matched.push({ type: "cusum", direction: s.direction, date: s.date });
      }
    }
  }

  if (
    config.conditions.includes("pctBaseline") &&
    pctChange != null &&
    Math.abs(pctChange) >= config.thresholdPct
  ) {
    matched.push({
      type: "pctBaseline",
      direction: pctChange >= 0 ? "up" : "down",
      date: last,
    });
  }

  if (config.conditions.includes("crossover") && run.candles.length > 0) {
    const cutIdx = Math.max(0, run.candles.length - config.withinBars);
    const cutoffTime = run.candles[cutIdx].time;
    for (const x of run.crossovers) {
      if (x.date >= cutoffTime) {
        matched.push({ type: "crossover", direction: x.direction, date: x.date });
      }
    }
  }

  if (matched.length === 0) return null;

  // Rank: CUSUM breaks are the strongest signal, then crossovers, then the raw
  // percent move breaks ties and orders within a class.
  const pctMag = pctChange == null ? 0 : Math.abs(pctChange);
  const hasCusum = matched.some((m) => m.type === "cusum");
  const hasCross = matched.some((m) => m.type === "crossover");
  const score = (hasCusum ? 1_000_000 : 0) + (hasCross ? 1_000 : 0) + pctMag;

  return {
    value: item.value,
    latest,
    baseline,
    pctChange,
    matched,
    sparkline: series.slice(-30).map((p) => p.value),
    score,
  };
}

export function screen(items: ScreenItem[], config: ScreenConfig): ScreenResult {
  let skippedVolume = 0;
  let scanned = 0;
  const hits: ScreenHit[] = [];

  for (const item of items) {
    if (item.total < config.minVolume) {
      skippedVolume += 1;
      continue;
    }
    scanned += 1;
    const hit = scanItem(item, config);
    if (hit) hits.push(hit);
  }

  hits.sort((a, b) => b.score - a.score);
  return { hits, scanned, skippedVolume };
}
