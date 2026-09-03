"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Band,
  Candle,
  Crossover,
  CusumSeriesPoint,
  IndicatorFlags,
  MetricKind,
  Point,
} from "@/lib/indicators/types";

export type SignalMetricId = "sessions" | "conversions" | "conversionRate";

export type UiSignal = {
  date: string;
  direction: "up" | "down";
  baselineMean?: number;
  baselineSd?: number;
  cusumValue?: number;
  provisional: boolean;
  acknowledgedAt: string | null;
};

export type SignalsPayload = {
  metric: string;
  metricLabel: string;
  kind: MetricKind;
  flags: IndicatorFlags;
  deseasonalized: Point[];
  controlBand: Band[];
  cusum: CusumSeriesPoint[];
  cusumThreshold: number;
  candles: Candle[];
  smaFast: (number | null)[];
  smaSlow: (number | null)[];
  crossovers: Crossover[];
  signals: UiSignal[];
  provisionalFromDate: string | null;
  keyMetric: string;
  ranAt: string;
  notes?: string[];
};

// Enabled metrics plus the cost metrics we deliberately show disabled: the
// Google Ads dev token is pending, so cost per acquisition / ROAS are surfaced
// with a reason rather than hidden, matching the spec.
export const SIGNAL_METRICS: {
  id: SignalMetricId;
  label: string;
  enabled: true;
}[] = [
  { id: "sessions", label: "Sessions", enabled: true },
  { id: "conversions", label: "Conversions", enabled: true },
  { id: "conversionRate", label: "Conversion rate", enabled: true },
];

export const DISABLED_METRICS: { label: string; reason: string }[] = [
  { label: "Cost per acquisition", reason: "Needs Google Ads (token pending)" },
  { label: "ROAS", reason: "Needs Google Ads (token pending)" },
];

export function useSignals(propertyId: string, metric: SignalMetricId) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: SignalsPayload | null;
  }>({ loading: false, error: null, data: null });

  const load = useCallback(() => {
    if (!propertyId) return () => {};
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(`/api/ga4/signals?metric=${encodeURIComponent(metric)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to compute signals.");
        return d as SignalsPayload;
      })
      .then((d) => {
        if (!cancelled) setState({ loading: false, error: null, data: d });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            loading: false,
            error: err instanceof Error ? err.message : "Failed to compute signals.",
            data: null,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, metric]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() marks loading before its async fetch
    const cleanup = load();
    return cleanup;
  }, [load]);

  return { ...state, reload: load };
}

export async function acknowledgeSignal(
  metric: string,
  direction: "up" | "down",
  firedOn: string
): Promise<void> {
  const res = await fetch("/api/ga4/signals/ack", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ metric, direction, firedOn }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error ?? "Could not acknowledge signal.");
  }
}
