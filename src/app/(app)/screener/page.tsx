"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown, Search, GitBranch, Bookmark, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { useGa4PropertyId } from "@/lib/storage";
import type { ScreenCondition } from "@/lib/indicators/screen";
import { suggestScanName, type SavedScan } from "@/lib/screener";

type Matched = { type: ScreenCondition; direction: "up" | "down"; date: string };
type Hit = {
  value: string;
  latest: number;
  baseline: number | null;
  pctChange: number | null;
  matched: Matched[];
  sparkline: number[];
};
type ScreenResponse = {
  hits: Hit[];
  scanned: number;
  skippedVolume: number;
  totalValues: number;
  capped: boolean;
  topN: number;
  metricName: string;
};

const DIMENSIONS = [
  { id: "campaign", label: "Campaign" },
  { id: "source", label: "Source" },
  { id: "medium", label: "Medium" },
  { id: "landingPage", label: "Landing page" },
] as const;

const METRICS = [
  { id: "sessions", label: "Sessions" },
  { id: "conversions", label: "Conversions" },
] as const;

const CONDITIONS: { id: ScreenCondition; label: string }[] = [
  { id: "cusum", label: "CUSUM break" },
  { id: "pctBaseline", label: "% vs baseline" },
  { id: "crossover", label: "SMA crossover" },
];

const inputClass =
  "w-20 rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <span className="text-xs text-zinc-300">n/a</span>;
  const w = 90, h = 24;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const rising = points[points.length - 1] >= points[0];
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={d} fill="none" stroke={rising ? "#12b795" : "#ef4444"} strokeWidth={1.5} />
    </svg>
  );
}

function SignalBadge({ m }: { m: Matched }) {
  const label =
    m.type === "cusum" ? "CUSUM" : m.type === "pctBaseline" ? "Baseline" : "Cross";
  const up = m.direction === "up";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {m.type === "crossover" ? (
        <GitBranch size={11} />
      ) : up ? (
        <TrendingUp size={11} />
      ) : (
        <TrendingDown size={11} />
      )}
      {label}
    </span>
  );
}

export default function ScreenerPage() {
  const [propertyId] = useGa4PropertyId();
  const [dimension, setDimension] = useState<string>("campaign");
  const [metric, setMetric] = useState<string>("sessions");
  const [conditions, setConditions] = useState<ScreenCondition[]>(["cusum", "pctBaseline", "crossover"]);
  const [thresholdPct, setThresholdPct] = useState(25);
  const [withinDays, setWithinDays] = useState(14);
  const [minVolume, setMinVolume] = useState(50);
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: ScreenResponse | null }>(
    { loading: false, error: null, data: null }
  );
  const [saved, setSaved] = useState<SavedScan[]>([]);
  const [saving, setSaving] = useState(false);

  const loadSaved = useCallback(() => {
    fetch("/api/screener/scans")
      .then((r) => (r.ok ? r.json() : { scans: [] }))
      .then((d) => setSaved((d.scans as SavedScan[]) ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const run = useCallback(() => {
    if (!propertyId || conditions.length === 0) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    const params = new URLSearchParams({
      dimension,
      metric,
      conditions: conditions.join(","),
      thresholdPct: String(thresholdPct),
      withinDays: String(withinDays),
      minVolume: String(minVolume),
    });
    fetch(`/api/ga4/screen?${params.toString()}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Scan failed.");
        return d as ScreenResponse;
      })
      .then((d) => setState({ loading: false, error: null, data: d }))
      .catch((e) => setState({ loading: false, error: e instanceof Error ? e.message : "Scan failed.", data: null }));
  }, [propertyId, dimension, metric, conditions, thresholdPct, withinDays, minVolume]);

  function toggleCondition(id: ScreenCondition) {
    setConditions((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function saveScan() {
    if (conditions.length === 0) return;
    setSaving(true);
    try {
      await fetch("/api/screener/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: suggestScanName({ dimension, metric, conditions }),
          dimension,
          metric,
          conditions,
          threshold_pct: thresholdPct,
          within_days: withinDays,
          min_volume: minVolume,
        }),
      });
      loadSaved();
    } finally {
      setSaving(false);
    }
  }

  function applyScan(scan: SavedScan) {
    setDimension(scan.dimension);
    setMetric(scan.metric);
    setConditions(scan.conditions);
    setThresholdPct(scan.threshold_pct);
    setWithinDays(scan.within_days);
    setMinVolume(scan.min_volume);
  }

  async function removeScan(id: string) {
    await fetch(`/api/screener/scans?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    loadSaved();
  }

  return (
    <>
      <Header title="Screener" subtitle="Scan campaigns, sources, and pages for indicator signals" />
      <div className="space-y-6 p-4 sm:p-6">
        <Card>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Scan</span>
              {DIMENSIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDimension(d.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    dimension === d.id ? "bg-green-600 text-white" : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {d.label}
                </button>
              ))}
              <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">by</span>
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetric(m.id)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    metric === m.id ? "bg-green-600 text-white" : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {CONDITIONS.map((c) => (
                  <label key={c.id} className="inline-flex items-center gap-1.5 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={conditions.includes(c.id)}
                      onChange={() => toggleCondition(c.id)}
                      className="accent-green-600"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                Threshold %
                <input type="number" className={inputClass} value={thresholdPct} onChange={(e) => setThresholdPct(Number(e.target.value))} />
              </label>
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                Within days
                <input type="number" className={inputClass} value={withinDays} onChange={(e) => setWithinDays(Number(e.target.value))} />
              </label>
              <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                Min volume
                <input type="number" className={inputClass} value={minVolume} onChange={(e) => setMinVolume(Number(e.target.value))} />
              </label>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveScan}
                  disabled={saving || conditions.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  <Bookmark size={15} />
                  {saving ? "Saving…" : "Save scan"}
                </button>
                <button
                  type="button"
                  onClick={run}
                  disabled={!propertyId || state.loading || conditions.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Search size={15} />
                  {state.loading ? "Scanning…" : "Run scan"}
                </button>
              </div>
            </div>

            {saved.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Saved</span>
                {saved.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white py-1 pl-3 pr-1 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => applyScan(s)}
                      className="font-medium text-zinc-700 hover:text-green-700"
                      title="Load this scan"
                    >
                      {s.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeScan(s.id)}
                      className="rounded-full p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                      title="Delete"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Card>

        {!propertyId ? (
          <Card>
            <p className="py-6 text-sm text-zinc-400">
              Connect Google Analytics in Integrations to run scans.
            </p>
          </Card>
        ) : state.loading ? (
          <Card>
            <div className="flex items-center gap-2 py-10 text-zinc-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Scanning across values…</span>
            </div>
          </Card>
        ) : state.error ? (
          <Card>
            <p className="py-4 text-sm text-red-600">{state.error}</p>
          </Card>
        ) : !state.data ? (
          <Card>
            <p className="py-6 text-sm text-zinc-400">Choose your filters and run a scan.</p>
          </Card>
        ) : state.data.hits.length === 0 ? (
          <Card>
            <p className="py-6 text-sm text-zinc-500">
              No matches. Scanned {state.data.scanned} value{state.data.scanned === 1 ? "" : "s"}
              {state.data.skippedVolume > 0 && `, skipped ${state.data.skippedVolume} below the volume floor`}.
            </p>
          </Card>
        ) : (
          <Card
            title={`${state.data.hits.length} match${state.data.hits.length === 1 ? "" : "es"}`}
            description={`Scanned ${state.data.scanned} of ${state.data.totalValues} values${
              state.data.capped ? ` (top ${state.data.topN} by ${metric})` : ""
            }. Ranked by signal strength.`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="py-2 pr-3 font-medium">Value</th>
                    <th className="py-2 pr-3 font-medium">Latest</th>
                    <th className="py-2 pr-3 font-medium">% vs base</th>
                    <th className="py-2 pr-3 font-medium">Signals</th>
                    <th className="py-2 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.hits.map((h) => (
                    <tr key={h.value} className="border-b border-zinc-100">
                      <td className="max-w-[220px] truncate py-2.5 pr-3 font-medium" title={h.value}>
                        <a
                          href={`/measurement/signals?dimension=${encodeURIComponent(dimension)}&value=${encodeURIComponent(h.value)}&metric=${encodeURIComponent(metric)}`}
                          className="text-green-700 hover:underline"
                        >
                          {h.value}
                        </a>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-zinc-700">{Math.round(h.latest)}</td>
                      <td
                        className={`py-2.5 pr-3 tabular-nums ${
                          h.pctChange == null ? "text-zinc-400" : h.pctChange >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {h.pctChange == null ? "n/a" : `${h.pctChange >= 0 ? "+" : ""}${h.pctChange.toFixed(0)}%`}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {h.matched.map((m, i) => (
                            <SignalBadge key={i} m={m} />
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <Sparkline points={h.sparkline} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
