// Client-safe screener labels and the auto-suggested name for a saved scan.
// Pure, no server imports, so both the UI and a unit test can use it.

import type { ScreenCondition } from "@/lib/indicators/screen";

export const DIMENSION_LABELS: Record<string, string> = {
  campaign: "Campaign",
  source: "Source",
  medium: "Medium",
  landingPage: "Landing page",
};

export const METRIC_LABELS: Record<string, string> = {
  sessions: "Sessions",
  conversions: "Conversions",
};

export const CONDITION_LABELS: Record<ScreenCondition, string> = {
  cusum: "CUSUM",
  pctBaseline: "Baseline",
  crossover: "Crossover",
};

export type SavedScan = {
  id: string;
  name: string;
  dimension: string;
  metric: string;
  conditions: ScreenCondition[];
  threshold_pct: number;
  within_days: number;
  min_volume: number;
};

// A readable default name, e.g. "Campaign · Sessions · CUSUM, Baseline".
export function suggestScanName(config: {
  dimension: string;
  metric: string;
  conditions: ScreenCondition[];
}): string {
  const dim = DIMENSION_LABELS[config.dimension] ?? config.dimension;
  const metric = METRIC_LABELS[config.metric] ?? config.metric;
  const conds = config.conditions.map((c) => CONDITION_LABELS[c] ?? c).join(", ");
  return conds ? `${dim} · ${metric} · ${conds}` : `${dim} · ${metric}`;
}
