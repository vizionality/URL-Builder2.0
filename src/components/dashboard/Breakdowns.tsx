"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/Card";
import { compact, metricLabel, pctDelta, type BreakdownMetric } from "@/lib/report";
import { MetricSelect } from "@/components/dashboard/MetricSelect";
import { getCached, setCached } from "@/lib/response-cache";

const LINE_COLORS = ["#12b795", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"];
const BAR = "#12b795";

type Series = { key: string; label: string };
type Trend = { data: Record<string, number | string>[]; series: Series[] };
type Breakdowns = {
  sources: { source: string; medium: string; users: number; prev: number }[];
  sourceTotal: { users: number; prev: number };
  sourceCount: number;
  sourceTrend: Trend;
  landingPages: { page: string; sessions: number; engagementRate: number }[];
  pageTrend: Trend;
  conversions: { event: string; count: number; prev: number }[];
  conversionTrend: Trend;
};

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-zinc-400">—</span>;
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center justify-end gap-0.5 ${up ? "text-green-600" : "text-red-600"}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {`${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`}
    </span>
  );
}

// A thin in-cell bar, like Looker's table bars.
function CellBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-right tabular-nums">{value.toLocaleString("en-US")}</span>
      <div className="h-3 flex-1 rounded-sm bg-zinc-100">
        <div className="h-3 rounded-sm" style={{ width: `${pct}%`, background: BAR }} />
      </div>
    </div>
  );
}

function TrendLines({ trend }: { trend: Trend }) {
  if (trend.data.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-400">No trend data in this range.</p>;
  }
  return (
    <div className="h-full min-h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend.data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#f1f5f4" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={shortDate} minTickGap={32} />
          <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v) => compact(Number(v))} />
          <Tooltip labelFormatter={(l) => shortDate(String(l))} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {trend.series.map((s, i) => (
            <Line
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

const th = "py-2 pr-3 text-left text-xs font-semibold text-zinc-500";
const td = "py-2 pr-3 text-sm text-zinc-700";
const pickable = "max-w-full truncate text-left hover:text-green-700 hover:underline";

export function Breakdowns({
  propertyId,
  startDate,
  endDate,
  filterQs,
  onSource,
  onMedium,
  onLanding,
  compare,
}: {
  propertyId: string;
  startDate: string;
  endDate: string;
  // Active dashboard filters as query params.
  filterQs: string;
  // Cross-filter: clicking a value filters the whole dashboard to it.
  onSource: (v: string) => void;
  onMedium: (v: string) => void;
  onLanding: (v: string) => void;
  compare: "period" | "year";
}) {
  // What Top Traffic Sources ranks and trends by; changing it re-queries.
  const [sourceMetric, setSourceMetric] = useState<BreakdownMetric>("totalUsers");
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: Breakdowns | null }>(
    { loading: false, error: null, data: null }
  );

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    const p = new URLSearchParams(filterQs);
    p.set("startDate", startDate);
    p.set("endDate", endDate);
    p.set("compare", compare);
    p.set("sourceMetric", sourceMetric);
    const url = `/api/ga4/breakdowns?${p.toString()}`;
    // A filter combination seen in the last few minutes shows instantly.
    const cached = getCached<Breakdowns>(url);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- serve a cached report synchronously
      setState({ loading: false, error: null, data: cached });
      return;
    }
    // Abort the previous request on a filter change so it stops using GA4 quota.
    const ac = new AbortController();
    // Keep the current tables on screen (dimmed) while the new ones load.
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(url, { signal: ac.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load breakdowns.");
        return d as Breakdowns;
      })
      .then((d) => {
        if (cancelled) return;
        setCached(url, d);
        setState({ loading: false, error: null, data: d });
      })
      .catch((e) => {
        if (!cancelled) setState({ loading: false, error: e instanceof Error ? e.message : "Failed to load breakdowns.", data: null });
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [propertyId, startDate, endDate, compare, filterQs, sourceMetric]);

  if (state.loading && !state.data) {
    return (
      <Card>
        <div className="flex items-center gap-2 py-10 text-zinc-400">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Loading sources, pages, and conversions…</span>
        </div>
      </Card>
    );
  }
  if (state.error) return <Card><p className="py-6 text-sm text-red-600">{state.error}</p></Card>;
  const d = state.data;
  if (!d) return null;

  const maxPage = Math.max(0, ...d.landingPages.map((p) => p.sessions));
  const maxConv = Math.max(0, ...d.conversions.map((c) => c.count));

  return (
    <div className={`space-y-6 transition-opacity ${state.loading ? "opacity-60" : ""}`}>
      {/* Top Traffic Sources */}
      <Card title="Top Traffic Sources" description={`Ranked by ${metricLabel(sourceMetric).toLowerCase()}. Click a source or medium to filter.`}>
        <MetricSelect value={sourceMetric} onChange={setSourceMetric} label="Top Traffic Sources metric" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className={th}>Source</th>
                  <th className={th}>Medium</th>
                  <th className={`${th} text-right`}>{metricLabel(sourceMetric)}</th>
                  <th className={`${th} text-right`}>%Δ</th>
                </tr>
              </thead>
              <tbody>
                {d.sources.map((s, i) => (
                  <tr key={`${s.source}-${s.medium}`} className="border-b border-zinc-100">
                    <td className={`${td} max-w-[160px] truncate`} title={s.source}>
                      <span className="mr-1.5 text-zinc-400">{i + 1}.</span>
                      <button type="button" onClick={() => onSource(s.source)} className={pickable}>{s.source}</button>
                    </td>
                    <td className={td}>
                      <button type="button" onClick={() => onMedium(s.medium)} className={pickable}>{s.medium}</button>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{s.users.toLocaleString("en-US")}</td>
                    <td className={`${td} text-right text-xs`}><Delta value={pctDelta(s.users, s.prev)} /></td>
                  </tr>
                ))}
                <tr>
                  <td className={`${td} font-semibold`} colSpan={2}>Grand total</td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{d.sourceTotal.users.toLocaleString("en-US")}</td>
                  <td className={`${td} text-right text-xs`}><Delta value={pctDelta(d.sourceTotal.users, d.sourceTotal.prev)} /></td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-zinc-400">
              Top {d.sources.length} of {d.sourceCount} source / medium pairs
            </p>
          </div>
          <TrendLines trend={d.sourceTrend} />
        </div>
      </Card>

      {/* Landing Pages */}
      <Card title="Landing Pages" description="Click a page to filter.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className={th}>Landing page</th>
                  <th className={th}>Sessions</th>
                  <th className={`${th} text-right`}>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {d.landingPages.map((p) => (
                  <tr key={p.page} className="border-b border-zinc-100">
                    <td className={`${td} max-w-[200px] truncate`} title={p.page}>
                      <button type="button" onClick={() => onLanding(p.page)} className={pickable}>{p.page}</button>
                    </td>
                    <td className={`${td} w-[45%]`}><CellBar value={p.sessions} max={maxPage} /></td>
                    <td className={`${td} text-right tabular-nums`}>{p.engagementRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TrendLines trend={d.pageTrend} />
        </div>
      </Card>

      {/* Conversions */}
      <Card title="Conversions">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto">
            {d.conversions.length === 0 ? (
              <p className="py-6 text-sm text-zinc-400">No key events recorded in this range.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className={th}>Event name</th>
                    <th className={th}>Count</th>
                    <th className={`${th} text-right`}>%Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {d.conversions.map((c) => (
                    <tr key={c.event} className="border-b border-zinc-100">
                      <td className={td}>{c.event}</td>
                      <td className={`${td} w-[50%]`}><CellBar value={c.count} max={maxConv} /></td>
                      <td className={`${td} text-right text-xs`}><Delta value={pctDelta(c.count, c.prev)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {d.conversionTrend.data.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-400">No conversions in this range.</p>
          ) : (
            <div className="h-full min-h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.conversionTrend.data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="#f1f5f4" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={shortDate} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} width={36} allowDecimals={false} />
                  <Tooltip labelFormatter={(l) => shortDate(String(l))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {d.conversionTrend.series.map((s, i) => (
                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={LINE_COLORS[i % LINE_COLORS.length]} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
