"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { useGa4PropertyId } from "@/lib/storage";
import {
  compact,
  formatDuration,
  pctDelta,
  presetRange,
  DATE_PRESETS,
  DEFAULT_PRESET,
  type DatePreset,
  type CompareMode,
} from "@/lib/report";
import { MultiSelect, type FilterOption } from "@/components/dashboard/MultiSelect";
import { Breakdowns } from "@/components/dashboard/Breakdowns";
import { getCached, setCached } from "@/lib/response-cache";
import { GeoMap } from "@/components/dashboard/GeoMap";

const GREEN = "#12b795";
const GREEN_LIGHT = "#a4ecd9";
const PIE_COLORS = ["#12b795", "#f59e0b", "#3b82f6", "#ec4899", "#22c55e", "#8b5cf6", "#14b8a6", "#eab308", "#64748b", "#f43f5e"];

type Metric = { value: number; prev: number };
type Overview = {
  scorecards: {
    views: Metric; totalUsers: Metric; newUsers: Metric; sessions: Metric;
    engagementRate: Metric; avgSessionDuration: Metric; generateLead: Metric;
  };
  channelGroup: { channel: string; users: number }[];
  topStates: { region: string; newUsers: number }[];
  geo: { region: string; newUsers: number }[];
  monthly: { month: string; current: number; previousYear: number }[];
  // Present only when requested with options=1.
  filters: { mediums: FilterOption[]; campaigns: FilterOption[]; sources?: FilterOption[]; pages?: FilterOption[] } | null;
  range: { startDate: string; endDate: string };
};

const inputClass =
  "rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

// Today's date on the viewer's clock (not UTC), as ISO, so presets like
// "Yesterday" mean the viewer's yesterday.
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatRangeLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value == null) return <span className="text-xs text-zinc-400">—</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${good ? "text-green-600" : "text-red-600"}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function Scorecard({ label, value, delta, invert }: { label: string; value: string; delta: number | null; invert?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
      <div className="mt-1"><Delta value={delta} invert={invert} /></div>
    </div>
  );
}

export default function DashboardPage() {
  const [propertyId] = useGa4PropertyId();
  const [today] = useState(localToday);
  // Looker Studio-style date control: a preset (default Last 28 days) or a
  // custom range, plus the %Δ comparison (previous period or previous year).
  const [preset, setPreset] = useState<DatePreset>(DEFAULT_PRESET);
  const [custom, setCustom] = useState(() => presetRange(DEFAULT_PRESET, today)!);
  const [compare, setCompare] = useState<CompareMode>("period");
  const { startDate, endDate } = preset === "custom" ? custom : presetRange(preset, today)!;
  // Empty selection means "all" (no filter), like Looker's all-checked state.
  const [medium, setMedium] = useState<string[]>([]);
  const [campaign, setCampaign] = useState<string[]>([]);
  const [source, setSource] = useState<string[]>([]);
  const [page, setPage] = useState<string[]>([]);
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: Overview | null }>(
    { loading: false, error: null, data: null }
  );
  // Dropdown lists load once and persist across filter changes (they don't
  // depend on the filters), which also saves two GA4 requests per change.
  const [options, setOptions] = useState<{ mediums: FilterOption[]; campaigns: FilterOption[]; sources?: FilterOption[]; pages?: FilterOption[] } | null>(null);
  const optionsLoaded = useRef(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    const p = new URLSearchParams({ startDate, endDate, compare });
    for (const m of medium) p.append("medium", m);
    for (const c of campaign) p.append("campaign", c);
    for (const x of source) p.append("source", x);
    for (const x of page) p.append("page", x);
    // A filter combination seen in the last few minutes shows instantly.
    const cacheKey = `/api/ga4/overview?${p.toString()}`;
    const cached = getCached<Overview>(cacheKey);
    // Use the cache unless the dropdown lists still need loading and this
    // cached response doesn't carry them (e.g. after navigating back here).
    if (cached && (optionsLoaded.current || cached.filters)) {
      if (cached.filters && !optionsLoaded.current) {
        optionsLoaded.current = true;
        setOptions(cached.filters);
      }
      setState({ loading: false, error: null, data: cached });
      return;
    }
    if (!optionsLoaded.current) p.set("options", "1");
    // Abort the previous request when filters change, so a stale report stops
    // using GA4 quota instead of competing with the new one.
    const ac = new AbortController();
    // Keep the current numbers on screen (dimmed) while the new ones load.
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(`/api/ga4/overview?${p.toString()}`, { signal: ac.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load report.");
        return d as Overview;
      })
      .then((d) => {
        if (cancelled) return;
        if (d.filters) {
          optionsLoaded.current = true;
          setOptions(d.filters);
        }
        setCached(cacheKey, d);
        setState({ loading: false, error: null, data: d });
      })
      .catch((e) => {
        if (cancelled) return; // superseded or aborted, not a real failure
        setState({ loading: false, error: e instanceof Error ? e.message : "Failed to load report.", data: null });
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [propertyId, startDate, endDate, compare, medium, campaign, source, page, retry]);

  const d = state.data;
  // Date range + page filters, for the Geo Map's city drill-down.
  const geoQuery = useMemo(() => {
    const p = new URLSearchParams({ startDate, endDate });
    for (const m of medium) p.append("medium", m);
    for (const c of campaign) p.append("campaign", c);
    for (const x of source) p.append("source", x);
    for (const x of page) p.append("page", x);
    return p.toString();
  }, [startDate, endDate, medium, campaign, source, page]);
  const s = d?.scorecards;
  const mediums = options?.mediums ?? [];
  const campaigns = options?.campaigns ?? [];
  const sources = options?.sources ?? [];
  const pages = options?.pages ?? [];

  const channelData = useMemo(
    () => (d?.channelGroup ?? []).map((c) => ({ name: c.channel, value: c.users })),
    [d]
  );
  const statesData = useMemo(
    () => (d?.topStates ?? []).map((x) => ({ region: x.region, newUsers: x.newUsers })),
    [d]
  );

  return (
    <>
      <Header title="Dashboard" subtitle="GA4 performance overview" />
      <main className="flex-1 px-4 py-6 sm:px-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <MultiSelect label="Session medium" options={mediums} selected={medium} onChange={setMedium} />
          <MultiSelect label="Session campaign" options={campaigns} selected={campaign} onChange={setCampaign} />
          <MultiSelect label="Session source" options={sources} selected={source} onChange={setSource} />
          <MultiSelect label="Page path" options={pages} selected={page} onChange={setPage} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={preset}
              onChange={(e) => {
                const next = e.target.value as DatePreset;
                // Switching to Custom starts from the range currently shown.
                if (next === "custom") setCustom({ startDate, endDate });
                setPreset(next);
              }}
              className={inputClass}
              aria-label="Date range"
            >
              {DATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            {preset === "custom" ? (
              <>
                <input type="date" value={custom.startDate} max={custom.endDate} onChange={(e) => e.target.value && setCustom((r) => ({ ...r, startDate: e.target.value }))} className={inputClass} />
                <span className="text-sm text-zinc-400">to</span>
                <input type="date" value={custom.endDate} min={custom.startDate} onChange={(e) => e.target.value && setCustom((r) => ({ ...r, endDate: e.target.value }))} className={inputClass} />
              </>
            ) : (
              <span className="text-sm text-zinc-600">
                {formatRangeLabel(startDate)} – {formatRangeLabel(endDate)}
              </span>
            )}
            <select value={compare} onChange={(e) => setCompare(e.target.value as CompareMode)} className={inputClass} aria-label="Compare to">
              <option value="period">vs. previous period</option>
              <option value="year">vs. previous year</option>
            </select>
          </div>
          {state.loading && state.data && (
            <span className="inline-flex w-full items-center gap-1.5 text-xs text-zinc-500" role="status">
              <Loader2 size={12} className="animate-spin" /> Updating…
            </span>
          )}
        </div>

        {!propertyId ? (
          <Card>
            <p className="py-8 text-center text-sm text-zinc-500">
              Connect a GA4 property in Integrations to see your report.
            </p>
          </Card>
        ) : state.loading && !d ? (
          <Card>
            <div className="flex items-center gap-2 py-10 text-zinc-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading GA4 report…</span>
            </div>
          </Card>
        ) : state.error ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <p className="text-sm text-red-600">{state.error}</p>
              <button
                type="button"
                onClick={() => setRetry((n) => n + 1)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Retry
              </button>
            </div>
          </Card>
        ) : !s || !d ? null : (
          <div className={`space-y-6 transition-opacity ${state.loading ? "opacity-60" : ""}`}>
            {/* Summary scorecards */}
            <Card title="Summary">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <Scorecard label="Views" value={compact(s.views.value)} delta={pctDelta(s.views.value, s.views.prev)} />
                <Scorecard label="Total users" value={compact(s.totalUsers.value)} delta={pctDelta(s.totalUsers.value, s.totalUsers.prev)} />
                <Scorecard label="New users" value={compact(s.newUsers.value)} delta={pctDelta(s.newUsers.value, s.newUsers.prev)} />
                <Scorecard label="Sessions" value={compact(s.sessions.value)} delta={pctDelta(s.sessions.value, s.sessions.prev)} />
                <Scorecard label="Engagement rate" value={`${s.engagementRate.value.toFixed(1)}%`} delta={pctDelta(s.engagementRate.value, s.engagementRate.prev)} />
                <Scorecard label="Avg session duration" value={formatDuration(s.avgSessionDuration.value)} delta={pctDelta(s.avgSessionDuration.value, s.avgSessionDuration.prev)} />
                <Scorecard label="Generate Lead" value={compact(s.generateLead.value)} delta={pctDelta(s.generateLead.value, s.generateLead.prev)} />
              </div>
            </Card>

            {/* Total Users Overview */}
            <Card title="Total Users Overview" description="This year vs. previous year, by month.">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.monthly} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
                    <CartesianGrid stroke="#f1f5f4" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={54} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => compact(Number(v))} />
                    <Tooltip />
                    <Legend />
                    <Bar name="Total users" dataKey="current" fill={GREEN} radius={[3, 3, 0, 0]} />
                    <Bar name="Previous year" dataKey="previousYear" fill={GREEN_LIGHT} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Channel Group */}
              <Card title="Channel Group" description="Total users by default channel group.">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={channelData} dataKey="value" nameKey="name" cx="45%" cy="50%" outerRadius={90}>
                        {channelData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Top States */}
              <Card title="Top States" description="New users by region.">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statesData} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                      <CartesianGrid stroke="#f1f5f4" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => compact(Number(v))} />
                      <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="newUsers" fill={GREEN} radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Geo Map */}
              <Card title="Geo Map" description="New users by US state.">
                {d.geo.length === 0 ? (
                  <p className="py-10 text-center text-sm text-zinc-400">No US state data in this range.</p>
                ) : (
                  <GeoMap data={d.geo} query={geoQuery} />
                )}
              </Card>
            </div>

            <Breakdowns
              propertyId={propertyId}
              startDate={startDate}
              endDate={endDate}
              medium={medium}
              campaign={campaign}
              source={source}
              page={page}
              compare={compare}
            />
          </div>
        )}
      </main>
    </>
  );
}
