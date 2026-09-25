"use client";

import { useEffect, useMemo, useState } from "react";
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
import { compact, formatDuration, pctDelta } from "@/lib/report";
import { Breakdowns } from "@/components/dashboard/Breakdowns";
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
  filters: { mediums: string[]; campaigns: string[] };
  range: { startDate: string; endDate: string };
};

const inputClass =
  "rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

function ytdRange() {
  const end = new Date().toISOString().slice(0, 10);
  return { startDate: `${end.slice(0, 4)}-01-01`, endDate: end };
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
  const [{ startDate, endDate }, setRange] = useState(ytdRange);
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: Overview | null }>(
    { loading: false, error: null, data: null }
  );

  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mark loading before the async fetch
    setState((s) => ({ ...s, loading: true, error: null }));
    const p = new URLSearchParams({ startDate, endDate });
    if (medium) p.set("medium", medium);
    if (campaign) p.set("campaign", campaign);
    fetch(`/api/ga4/overview?${p.toString()}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load report.");
        return d as Overview;
      })
      .then((d) => { if (!cancelled) setState({ loading: false, error: null, data: d }); })
      .catch((e) => { if (!cancelled) setState({ loading: false, error: e instanceof Error ? e.message : "Failed to load report.", data: null }); });
    return () => { cancelled = true; };
  }, [propertyId, startDate, endDate, medium, campaign]);

  const d = state.data;
  const s = d?.scorecards;
  const mediums = d?.filters.mediums ?? [];
  const campaigns = d?.filters.campaigns ?? [];

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
          <select value={medium} onChange={(e) => setMedium(e.target.value)} className={inputClass}>
            <option value="">Session medium (all)</option>
            {mediums.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={campaign} onChange={(e) => setCampaign(e.target.value)} className={inputClass}>
            <option value="">Session campaign (all)</option>
            {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} className={inputClass} />
            <span className="text-sm text-zinc-400">to</span>
            <input type="date" value={endDate} onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} className={inputClass} />
          </div>
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
          <Card><p className="py-6 text-sm text-red-600">{state.error}</p></Card>
        ) : !s || !d ? null : (
          <div className="space-y-6">
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
                  <GeoMap data={d.geo} />
                )}
              </Card>
            </div>

            <Breakdowns
              propertyId={propertyId}
              startDate={startDate}
              endDate={endDate}
              medium={medium}
              campaign={campaign}
            />
          </div>
        )}
      </main>
    </>
  );
}
