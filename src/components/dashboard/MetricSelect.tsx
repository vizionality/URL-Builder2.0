"use client";

import { BREAKDOWN_METRICS, type BreakdownMetric } from "@/lib/report";

// Compact metric dropdown for a dashboard card.
export function MetricSelect({
  value,
  onChange,
  label,
}: {
  value: BreakdownMetric;
  onChange: (m: BreakdownMetric) => void;
  label: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as BreakdownMetric)}
      aria-label={label}
      className="-mt-2 mb-3 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700"
    >
      {BREAKDOWN_METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
    </select>
  );
}
