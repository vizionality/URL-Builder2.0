"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { MODEL_LABELS, type AttributionModel } from "@/lib/attribution/models";
import type { AttributionReport } from "@/lib/attribution/engine";

type Site = { id: string; name: string };

type ReportResponse = {
  report: AttributionReport;
  model: AttributionModel;
  modelLabel: string;
  site: { id: string; name: string };
  range: { startDate: string; endDate: string };
};

const MODELS: AttributionModel[] = ["first", "last", "linear", "timeDecay", "positionBased"];
const BAR = "#12b795";

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}

export function AttributionDashboard({ sites }: { sites: Site[] }) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [model, setModel] = useState<AttributionModel>("linear");
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: ReportResponse | null;
  }>({ loading: false, error: null, data: null });

  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mark loading before the async fetch starts
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(`/api/attribution/report?site_id=${encodeURIComponent(siteId)}&model=${model}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load report.");
        return d as ReportResponse;
      })
      .then((d) => {
        if (!cancelled) setState({ loading: false, error: null, data: d });
      })
      .catch((e) => {
        if (!cancelled)
          setState({
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load report.",
            data: null,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, model]);

  const report = state.data?.report;
  const chartData = useMemo(
    () =>
      (report?.byChannel ?? []).map((c) => ({
        channel: c.channel,
        credit: Number(c.conversions.toFixed(2)),
      })),
    [report]
  );

  return (
    <Card
      title="Attribution funnel"
      description="Multi-touch credit across the channels that led to conversions. Last 90 days."
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm"
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1">
          {MODELS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModel(m)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                model === m
                  ? "bg-green-600 text-white"
                  : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {MODEL_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {state.loading ? (
        <div className="flex items-center gap-2 py-10 text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Building report…</span>
        </div>
      ) : state.error ? (
        <p className="py-4 text-sm text-red-600">{state.error}</p>
      ) : !report ? null : report.empty === "no-touches" ? (
        <EmptyState
          title="No touches captured yet"
          detail="Once the GTM tag is live and traffic arrives, journeys will appear here."
        />
      ) : report.empty === "no-conversions" ? (
        <EmptyState
          title="No conversions in range"
          detail="Touches are being captured, but no conversions have been recorded yet. Send a conversion event to attribute it."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Conversions" value={String(report.totalConversions)} />
            <StatCard label="Attributed value" value={`$${report.totalValue.toFixed(0)}`} />
            <StatCard label="Unique visitors" value={String(report.uniqueVisitors)} />
            <StatCard
              label="Avg touches / conv"
              value={report.avgTouchesPerConversion.toFixed(1)}
            />
            <StatCard
              label="Avg days to convert"
              value={report.avgDaysToConvert == null ? "n/a" : report.avgDaysToConvert.toFixed(1)}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Credit by channel
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f4" />
                  <XAxis dataKey="channel" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="credit" fill={BAR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Top conversion paths
            </p>
            <ul className="divide-y divide-zinc-100 overflow-hidden rounded-md border border-zinc-200">
              {report.topPaths.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.path.map((ch, j) => (
                      <span key={j} className="inline-flex items-center gap-1.5">
                        {j > 0 && <span className="text-zinc-300">→</span>}
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">
                          {ch}
                        </span>
                      </span>
                    ))}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-zinc-500">{p.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
