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
import { ChevronLeft, ChevronRight, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/Card";
import {
  bucketLabel,
  bucketTrend,
  compact,
  metricLabel,
  pctDelta,
  TIME_GRAINS,
  type BreakdownMetric,
  type TimeGrain,
} from "@/lib/report";
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
  // "day" = daily rows; otherwise already bucketed by GA4 (total users).
  sourceTrendGrain?: TimeGrain;
  landingPages: { page: string; sessions: number; engagementRate: number }[];
  pageTrend: Trend;
  conversions: { event: string; count: number; prev: number }[];
  conversionTrend: Trend;
};

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

// Day / Week / Month / Quarter picker for a trend chart.
function GrainSelect({ value, onChange, label }: { value: TimeGrain; onChange: (g: TimeGrain) => void; label: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TimeGrain)}
      aria-label={label}
      className="mb-2 self-end rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-700"
    >
      {TIME_GRAINS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
    </select>
  );
}

function TrendLines({
  trend,
  grain,
  selected = grain,
  onGrain,
  label,
}: {
  trend: Trend;
  // Grain the data is in (for labels) and the one picked (for the dropdown);
  // they differ only while a newly picked grain loads.
  grain: TimeGrain;
  selected?: TimeGrain;
  onGrain: (g: TimeGrain) => void;
  label: string;
}) {
  if (trend.data.length === 0) {
    return <p className="py-10 text-center text-sm text-zinc-400">No trend data in this range.</p>;
  }
  return (
    <div className="flex h-full min-h-72 w-full flex-col">
      <GrainSelect value={selected} onChange={onGrain} label={label} />
      <div className="min-h-64 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trend.data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#f1f5f4" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => bucketLabel(String(v), grain)} minTickGap={32} />
          <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v) => compact(Number(v))} />
          <Tooltip labelFormatter={(l) => bucketLabel(String(l), grain)} />
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
    </div>
  );
}

const th = "py-2 pr-3 text-left text-xs font-semibold text-zinc-500";
const td = "py-2 pr-3 text-sm text-zinc-700";
const PER_PAGE = 10;

// One page of a table: rows, where it starts, and how many pages there are.
function slicePage<T>(items: T[], requested: number) {
  const count = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.max(0, Math.min(requested, count - 1));
  const start = page * PER_PAGE;
  return { page, count, start, total: items.length, rows: items.slice(start, start + PER_PAGE) };
}

// "11-20 of 124 landing pages" with previous/next arrows when there is more than one page.
function Pager({
  page,
  noun,
  onGo,
}: {
  page: ReturnType<typeof slicePage>;
  noun: string;
  onGo: (n: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-500">
      <span>
        {page.total === 0 ? `No ${noun}` : `${page.start + 1}-${page.start + page.rows.length} of ${page.total} ${noun}`}
      </span>
      {page.count > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onGo(page.page - 1)}
            disabled={page.page === 0}
            aria-label="Previous page"
            className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tabular-nums">Page {page.page + 1} of {page.count}</span>
          <button
            type="button"
            onClick={() => onGo(page.page + 1)}
            disabled={page.page >= page.count - 1}
            aria-label="Next page"
            className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
// Key events are covered by the Conversions card below.
const NO_KEY_EVENTS: BreakdownMetric[] = ["keyEvents"];
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
  // Table pages (Top Traffic Sources, Landing Pages), tied to the report it was chosen on: new data
  // (a filter, date or metric change) starts back at page one.
  // Conversions chart grain; the rollup happens here from the daily series.
  const [convGrain, setConvGrain] = useState<TimeGrain>("day");
  const [srcGrain, setSrcGrain] = useState<TimeGrain>("day");
  const [pageGrain, setPageGrain] = useState<TimeGrain>("day");
  // Total users can't be summed from days, so GA4 buckets that trend (a refetch);
  // everything else rolls up in the browser.
  const serverGrain = sourceMetric === "totalUsers" ? srcGrain : "day";
  const [pages, setPages] = useState<{ data: Breakdowns | null; src: number; lp: number }>({ data: null, src: 0, lp: 0 });
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
    if (serverGrain !== "day") p.set("sourceGrain", serverGrain);
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
  }, [propertyId, startDate, endDate, compare, filterQs, sourceMetric, serverGrain]);

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
  const fresh = pages.data === d;
  const src = slicePage(d.sources, fresh ? pages.src : 0);
  const lp = slicePage(d.landingPages, fresh ? pages.lp : 0);
  const goTo = (which: "src" | "lp", n: number) =>
    setPages({ data: d, src: src.page, lp: lp.page, [which]: n });
  const convData = bucketTrend(d.conversionTrend.data, convGrain);
  // Already-bucketed total users shows as is (labeled by its own grain while a
  // new grain loads); daily rows roll up to the chosen grain.
  const srcDataGrain = d.sourceTrendGrain ?? "day";
  const srcTrend =
    srcDataGrain !== "day"
      ? { trend: d.sourceTrend, grain: srcDataGrain }
      : sourceMetric === "totalUsers"
        ? { trend: d.sourceTrend, grain: "day" as TimeGrain }
        : { trend: { ...d.sourceTrend, data: bucketTrend(d.sourceTrend.data, srcGrain) }, grain: srcGrain };
  const pageTrend = { ...d.pageTrend, data: bucketTrend(d.pageTrend.data, pageGrain) };
  const maxConv = Math.max(0, ...d.conversions.map((c) => c.count));

  return (
    <div className={`space-y-6 transition-opacity ${state.loading ? "opacity-60" : ""}`}>
      {/* Top Traffic Sources */}
      <Card title="Top Traffic Sources" description={`Ranked by ${metricLabel(sourceMetric).toLowerCase()}. Click a source or medium to filter.`}>
        <MetricSelect value={sourceMetric} onChange={setSourceMetric} label="Top Traffic Sources metric" exclude={NO_KEY_EVENTS} />
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
                {src.rows.map((s, i) => (
                  <tr key={`${s.source}-${s.medium}`} className="border-b border-zinc-100">
                    <td className={`${td} max-w-[160px] truncate`} title={s.source}>
                      <span className="mr-1.5 text-zinc-400">{src.start + i + 1}.</span>
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
            <Pager page={src} noun="source / medium pairs" onGo={(n) => goTo("src", n)} />
          </div>
          <TrendLines trend={srcTrend.trend} grain={srcTrend.grain} selected={srcGrain} onGrain={setSrcGrain} label="Traffic sources time grain" />
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
                {lp.rows.map((p) => (
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
            <Pager page={lp} noun="landing pages" onGo={(n) => goTo("lp", n)} />
          </div>
          <TrendLines trend={pageTrend} grain={pageGrain} onGrain={setPageGrain} label="Landing pages time grain" />
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
            <div className="flex h-full min-h-72 w-full flex-col">
              <GrainSelect value={convGrain} onChange={setConvGrain} label="Conversions time grain" />
              <div className="min-h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={convData} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="#f1f5f4" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => bucketLabel(String(v), convGrain)} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} width={36} allowDecimals={false} />
                  <Tooltip labelFormatter={(l) => bucketLabel(String(l), convGrain)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {d.conversionTrend.series.map((s, i) => (
                    <Bar key={s.key} dataKey={s.key} name={s.label} fill={LINE_COLORS[i % LINE_COLORS.length]} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
