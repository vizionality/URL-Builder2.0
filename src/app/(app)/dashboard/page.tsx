"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { LayoutGrid, Loader2, TrendingUp, TrendingDown, X } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { useGa4PropertyId } from "@/lib/storage";
import {
  compact,
  formatDuration,
  pctDelta,
  presetRange,
  DEFAULT_PRESET,
  metricLabel,
  type BreakdownMetric,
  type MetricValues,
  type CompareMode,
} from "@/lib/report";
import { DateRangePicker, resolveRange, type DateValue } from "@/components/dashboard/DateRangePicker";
import { WidgetSidebar, type SaveStatus } from "@/components/dashboard/WidgetSidebar";
import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { DashboardDropZone, SortableWidget } from "@/components/dashboard/DragParts";
import { ExtraWidgetCard, useExtraWidgets } from "@/components/dashboard/ExtraWidgets";
import type { WidgetData } from "@/lib/extra-widgets";
import {
  applyDrop,
  extraParts,
  breakdownParts,
  DEFAULT_LAYOUT,
  NEW_PREFIX,
  layoutBlocks,
  overviewParts,
  WIDGET_BY_ID,
} from "@/lib/dashboard-widgets";
import { MetricSelect } from "@/components/dashboard/MetricSelect";
import { MultiSelect, type FilterOption } from "@/components/dashboard/MultiSelect";
import { Breakdowns, type BreakdownPart } from "@/components/dashboard/Breakdowns";
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
  channelGroup: { channel: string; values: MetricValues }[];
  topStates: { region: string; values: MetricValues }[];
  geo: { region: string; values: MetricValues }[];
  monthly: { month: string; current: Record<MonthlyMetric, number>; previousYear: Record<MonthlyMetric, number> }[];
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

type MonthlyMetric = "totalUsers" | "newUsers" | "returningUsers" | "sessions" | "engagedSessions";
const MONTHLY_OPTIONS: { id: MonthlyMetric; label: string }[] = [
  { id: "totalUsers", label: "Total users" },
  { id: "newUsers", label: "New users" },
  { id: "returningUsers", label: "Returning users" },
  { id: "sessions", label: "Sessions" },
  { id: "engagedSessions", label: "Engaged sessions" },
];

// Prefer the widget under the pointer, then the sidebar or dashboard area under
// it; with the keyboard (no pointer), the nearest widget. The big drop areas
// never win over a widget, so a reorder can't land on "the dashboard" by accident.
const dropCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const widgets = hits.filter((h) => !String(h.id).startsWith("drop:"));
  if (widgets.length) return widgets;
  if (hits.length) return hits;
  return closestCenter({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => !String(c.id).startsWith("drop:")),
  });
};

type Scorecards = Overview["scorecards"];
const EXTRA_SCORE_LABELS: Record<string, string> = {
  "sc.bounceRate": "Bounce rate",
  "sc.pagesPerSession": "Views per session",
  "sc.engagedSessions": "Engaged sessions",
  "sc.eventCount": "Event count",
  "sc.keyEvents": "Key events",
};
// One summary scorecard by widget id.
function ScorecardFor({ id, s, extras }: { id: string; s: Scorecards; extras: Record<string, WidgetData> }) {
  const extra = extras[id];
  if (id in EXTRA_SCORE_LABELS) {
    const label = EXTRA_SCORE_LABELS[id];
    if (!extra || extra.kind !== "score") return <Scorecard label={label} value="…" delta={null} />;
    const value =
      extra.format === "percent" ? `${extra.value.toFixed(1)}%`
      : extra.format === "decimal" ? extra.value.toFixed(2)
      : compact(extra.value);
    // A falling bounce rate is good news.
    return <Scorecard label={label} value={value} delta={pctDelta(extra.value, extra.prev)} invert={id === "sc.bounceRate"} />;
  }
  switch (id) {
    case "sc.views": return <Scorecard label="Views" value={compact(s.views.value)} delta={pctDelta(s.views.value, s.views.prev)} />;
    case "sc.totalUsers": return <Scorecard label="Total users" value={compact(s.totalUsers.value)} delta={pctDelta(s.totalUsers.value, s.totalUsers.prev)} />;
    case "sc.newUsers": return <Scorecard label="New users" value={compact(s.newUsers.value)} delta={pctDelta(s.newUsers.value, s.newUsers.prev)} />;
    case "sc.sessions": return <Scorecard label="Sessions" value={compact(s.sessions.value)} delta={pctDelta(s.sessions.value, s.sessions.prev)} />;
    case "sc.engagementRate": return <Scorecard label="Engagement rate" value={`${s.engagementRate.value.toFixed(1)}%`} delta={pctDelta(s.engagementRate.value, s.engagementRate.prev)} />;
    case "sc.avgSessionDuration": return <Scorecard label="Avg session duration" value={formatDuration(s.avgSessionDuration.value)} delta={pctDelta(s.avgSessionDuration.value, s.avgSessionDuration.prev)} />;
    case "sc.generateLead": return <Scorecard label="Generate Lead" value={compact(s.generateLead.value)} delta={pctDelta(s.generateLead.value, s.generateLead.prev)} />;
    default: return null;
  }
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
    // Fills its grid cell, so every card in the row is as tall as the tallest
    // (e.g. a label that wraps); the value and %Δ sit at the bottom, aligned.
    <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      {/* Right padding keeps a long label clear of the drag handle. */}
      <p className="pr-6 text-xs text-zinc-500">{label}</p>
      <p className="mt-auto pt-1 text-2xl font-semibold text-zinc-900">{value}</p>
      <div className="mt-1"><Delta value={delta} invert={invert} /></div>
    </div>
  );
}

export default function DashboardPage() {
  const [propertyId] = useGa4PropertyId();
  const [today] = useState(localToday);
  // Looker Studio-style date control: a preset (default Last 28 days) or a
  // custom range, plus the %Δ comparison (previous period or previous year).
  const [dates, setDates] = useState<DateValue>(() => ({
    preset: DEFAULT_PRESET,
    includeToday: false,
    custom: presetRange(DEFAULT_PRESET, today)!,
  }));
  const [compare, setCompare] = useState<CompareMode>("period");
  const [monthlyMetric, setMonthlyMetric] = useState<MonthlyMetric>("totalUsers");
  // Defaults match the Hearthside report: channel by total users, states by new users.
  const [channelMetric, setChannelMetric] = useState<BreakdownMetric>("totalUsers");
  const [geoMetric, setGeoMetric] = useState<BreakdownMetric>("newUsers");
  const shownRange = resolveRange(dates, today);
  const startDate = shownRange.startDate;
  // Whole-period presets ("This month") reach past today; GA4 has nothing
  // there yet, so query through today while the picker shows the full period.
  const endDate = shownRange.endDate > today ? today : shownRange.endDate;
  // Empty selection means "all" (no filter), like Looker's all-checked state.
  const [medium, setMedium] = useState<string[]>([]);
  const [campaign, setCampaign] = useState<string[]>([]);
  const [source, setSource] = useState<string[]>([]);
  const [page, setPage] = useState<string[]>([]);
  // Cross-filters set by clicking a chart (no dropdown of their own).
  const [channel, setChannel] = useState<string[]>([]);
  const [landing, setLanding] = useState<string[]>([]);
  const [region, setRegion] = useState<string[]>([]);
  // Every active filter as query params (dates and compare added per request).
  const filterQs = useMemo(() => {
    const p = new URLSearchParams();
    const add = (k: string, vs: string[]) => vs.forEach((v) => p.append(k, v));
    add("medium", medium);
    add("campaign", campaign);
    add("source", source);
    add("page", page);
    add("channel", channel);
    add("landing", landing);
    add("region", region);
    return p.toString();
  }, [medium, campaign, source, page, channel, landing, region]);
  const [state, setState] = useState<{ loading: boolean; error: string | null; data: Overview | null }>(
    { loading: false, error: null, data: null }
  );
  // Dropdown lists load once and persist across filter changes (they don't
  // depend on the filters), which also saves two GA4 requests per change.
  const [options, setOptions] = useState<{ mediums: FilterOption[]; campaigns: FilterOption[]; sources?: FilterOption[]; pages?: FilterOption[] } | null>(null);
  const optionsLoaded = useRef(false);
  const [retry, setRetry] = useState(0);

  // Widget layout, saved per user + property (see /api/dashboard/layout).
  // Reports wait for it so hidden widgets never cost a GA4 request.
  const [layout, setLayout] = useState<string[] | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    fetch("/api/dashboard/layout")
      .then((r) => r.json())
      .then((d: { widgets?: string[]; saveUnavailable?: boolean }) => {
        if (cancelled) return;
        setLayout(Array.isArray(d.widgets) ? d.widgets : DEFAULT_LAYOUT);
        if (d.saveUnavailable) setSaveStatus("unavailable");
      })
      .catch(() => !cancelled && setLayout(DEFAULT_LAYOUT));
    return () => {
      cancelled = true;
    };
  }, [propertyId]);
  // Save shortly after the last change, so several quick toggles are one write.
  const persistLayout = useCallback((next: string[]) => {
    setLayout(next);
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/dashboard/layout", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ widgets: next }),
      })
        .then((r) => setSaveStatus(r.ok ? "saved" : "error"))
        .catch(() => setSaveStatus("error"));
    }, 600);
  }, []);
  const toggleWidget = useCallback(
    (id: string) => {
      const cur = layout ?? DEFAULT_LAYOUT;
      // A newly added widget goes at the end.
      persistLayout(cur.includes(id) ? cur.filter((w) => w !== id) : [...cur, id]);
    },
    [layout, persistLayout]
  );
  const resetWidgets = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setLayout(DEFAULT_LAYOUT);
    setSaveStatus("saving");
    fetch("/api/dashboard/layout", { method: "DELETE" })
      .then((r) => setSaveStatus(r.ok ? "saved" : "error"))
      .catch(() => setSaveStatus("error"));
  }, []);
  const closeSidebar = useCallback(() => setCustomizing(false), []);
  // Drag and drop: mouse (after a small move), touch (press and hold), keyboard.
  const [dragging, setDragging] = useState<string | null>(null);
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const partsKey = layout ? overviewParts(layout).join(",") : null;
  // Extra GA4 widgets (bounce rate, devices, ...) load separately, only when on the layout.
  const extraQuery = useMemo(() => {
    const p = new URLSearchParams(filterQs);
    p.set("startDate", startDate);
    p.set("endDate", endDate);
    p.set("compare", compare);
    return p.toString();
  }, [filterQs, startDate, endDate, compare]);
  const extras = useExtraWidgets(layout ? extraParts(layout) : [], extraQuery, Boolean(propertyId && layout));

  useEffect(() => {
    if (!propertyId || partsKey == null) return;
    let cancelled = false;
    const p = new URLSearchParams(filterQs);
    p.set("parts", partsKey);
    p.set("startDate", startDate);
    p.set("endDate", endDate);
    p.set("compare", compare);
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
  }, [propertyId, startDate, endDate, compare, filterQs, retry, partsKey]);

  const d = state.data;
  // Date range + filters, for the Geo Map's city drill-down.
  const geoQuery = `${filterQs}${filterQs ? "&" : ""}startDate=${startDate}&endDate=${endDate}`;

  // Clicking a chart value filters the whole dashboard to it; clicking the
  // same value again clears that filter.
  const pick = (set: (v: string[]) => void, cur: string[]) => (v: string) =>
    set(cur.length === 1 && cur[0] === v ? [] : [v]);
  const chips: { label: string; value: string; clear: () => void }[] = [
    ...medium.map((v) => ({ label: "Medium", value: v, clear: () => setMedium(medium.filter((x) => x !== v)) })),
    ...campaign.map((v) => ({ label: "Campaign", value: v, clear: () => setCampaign(campaign.filter((x) => x !== v)) })),
    ...source.map((v) => ({ label: "Source", value: v, clear: () => setSource(source.filter((x) => x !== v)) })),
    ...page.map((v) => ({ label: "Page path", value: v, clear: () => setPage(page.filter((x) => x !== v)) })),
    ...channel.map((v) => ({ label: "Channel", value: v, clear: () => setChannel([]) })),
    ...landing.map((v) => ({ label: "Landing page", value: v, clear: () => setLanding([]) })),
    ...region.map((v) => ({ label: "State", value: v, clear: () => setRegion([]) })),
  ];
  const pickChannel = pick(setChannel, channel);
  const pickRegion = pick(setRegion, region);
  const clearAll = () => {
    [setMedium, setCampaign, setSource, setPage, setChannel, setLanding, setRegion].forEach((f) => f([]));
  };
  const s = d?.scorecards;
  const mediums = options?.mediums ?? [];
  const campaigns = options?.campaigns ?? [];
  const sources = options?.sources ?? [];
  const pages = options?.pages ?? [];

  const monthlyLabel = MONTHLY_OPTIONS.find((o) => o.id === monthlyMetric)!.label;
  // Switching the metric is instant: every metric arrives with the report.
  const monthlyData = useMemo(
    () =>
      (d?.monthly ?? []).map((row) => ({
        month: row.month,
        current: row.current[monthlyMetric] ?? 0,
        previousYear: row.previousYear[monthlyMetric] ?? 0,
      })),
    [d, monthlyMetric]
  );
  // Channel, states and map carry every metric; the dropdowns just pick one.
  const channelData = useMemo(
    () =>
      (d?.channelGroup ?? [])
        .map((c) => ({ name: c.channel, value: c.values[channelMetric] ?? 0 }))
        .filter((c) => c.value > 0)
        .sort((a, b) => b.value - a.value),
    [d, channelMetric]
  );
  const statesData = useMemo(
    () =>
      (d?.topStates ?? [])
        .map((x) => ({ region: x.region, value: x.values[geoMetric] ?? 0 }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [d, geoMetric]
  );
  const geoData = useMemo(
    () =>
      (d?.geo ?? [])
        .map((x) => ({ region: x.region, value: x.values[geoMetric] ?? 0 }))
        .filter((x) => x.value > 0),
    [d, geoMetric]
  );

  return (
    <>
      <Header title="Dashboard" subtitle="GA4 performance overview" />
      <DndContext
        sensors={dndSensors}
        collisionDetection={dropCollision}
        onDragStart={(e) => setDragging(String(e.active.id))}
        onDragCancel={() => setDragging(null)}
        onDragEnd={(e) => {
          setDragging(null);
          if (!layout) return;
          const next = applyDrop(layout, String(e.active.id), e.over ? String(e.over.id) : null);
          if (next !== layout) persistLayout(next);
        }}
      >
      {/* Leave room for the Customize panel on wide screens so both stay usable while dragging. */}
      <main className={`flex-1 px-4 py-6 sm:px-6 ${customizing ? "lg:pr-[25rem]" : ""}`}>
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <MultiSelect label="Session medium" options={mediums} selected={medium} onChange={setMedium} />
          <MultiSelect label="Session campaign" options={campaigns} selected={campaign} onChange={setCampaign} />
          <MultiSelect label="Session source" options={sources} selected={source} onChange={setSource} />
          <MultiSelect label="Page path" options={pages} selected={page} onChange={setPage} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <LayoutGrid className="h-4 w-4" /> Customize
            </button>
            <DateRangePicker value={dates} today={today} onChange={setDates} />
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

        {/* Active filters, including ones set by clicking a chart */}
        {chips.length > 0 && (
          <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <span
                key={`${c.label}:${c.value}`}
                className="inline-flex max-w-72 items-center gap-1 rounded-full border border-green-200 bg-green-50 py-0.5 pl-2.5 pr-1 text-xs text-green-800"
              >
                <span className="text-green-600">{c.label}:</span>
                <span className="truncate font-medium">{c.value}</span>
                <button
                  type="button"
                  onClick={c.clear}
                  aria-label={`Remove ${c.label} filter`}
                  className="rounded-full p-0.5 hover:bg-green-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button type="button" onClick={clearAll} className="text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:underline">
              Clear all
            </button>
          </div>
        )}

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
        ) : !d || !layout ? null : (
          <Breakdowns
            propertyId={propertyId}
            startDate={startDate}
            endDate={endDate}
            filterQs={filterQs}
            onSource={pick(setSource, source)}
            onMedium={pick(setMedium, medium)}
            onLanding={pick(setLanding, landing)}
            compare={compare}
            parts={breakdownParts(layout) as BreakdownPart[]}
          >
            {(tables) => {
              // Every widget's card; the layout picks which appear and in what order.
              const cards: Record<string, React.ReactNode> = {
                monthly: (
            <Card title={`${monthlyLabel} Overview`} description="This year vs. previous year, by month.">
              <select
                value={monthlyMetric}
                onChange={(e) => setMonthlyMetric(e.target.value as MonthlyMetric)}
                aria-label="Overview metric"
                className={`${inputClass} -mt-2 mb-3`}
              >
                {MONTHLY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
                    <CartesianGrid stroke="#f1f5f4" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={54} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => compact(Number(v))} />
                    <Tooltip />
                    <Legend />
                    <Bar name={monthlyLabel} dataKey="current" fill={GREEN} radius={[3, 3, 0, 0]} />
                    <Bar name="Previous year" dataKey="previousYear" fill={GREEN_LIGHT} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
                ),
                channel: (
              <Card title="Channel Group" description={`${metricLabel(channelMetric)} by default channel group. Click a slice to filter.`}>
                <MetricSelect value={channelMetric} onChange={setChannelMetric} label="Channel Group metric" />
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelData}
                        dataKey="value"
                        nameKey="name"
                        cx="45%"
                        cy="50%"
                        outerRadius={90}
                        className="cursor-pointer"
                        onClick={(e) => e?.name != null && pickChannel(String(e.name))}
                      >
                        {channelData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
                ),
                states: (
              <Card title="Top States" description={`${metricLabel(geoMetric)} by region. Click a bar to filter.`}>
                <MetricSelect value={geoMetric} onChange={setGeoMetric} label="Top States and Geo Map metric" />
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statesData} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                      <CartesianGrid stroke="#f1f5f4" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => compact(Number(v))} />
                      <YAxis type="category" dataKey="region" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip />
                      <Bar
                        name={metricLabel(geoMetric)}
                        dataKey="value"
                        fill={GREEN}
                        radius={[0, 3, 3, 0]}
                        className="cursor-pointer"
                        onClick={(e) => {
                          const r = (e as { payload?: { region?: string } })?.payload?.region;
                          if (r) pickRegion(r);
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
                ),
                geo: (
              <Card
                title="Geo Map"
                description={`${metricLabel(geoMetric)} by US state.${layout.includes("states") ? " Follows the Top States metric." : ""}`}
              >
                {/* The metric dropdown lives on Top States; without that card, it moves here. */}
                {!layout.includes("states") && (
                  <MetricSelect value={geoMetric} onChange={setGeoMetric} label="Geo Map metric" />
                )}
                {geoData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-zinc-400">No US state data in this range.</p>
                ) : (
                  <GeoMap data={geoData} metric={geoMetric} query={geoQuery} />
                )}
              </Card>
                ),
                ...tables,
                ...Object.fromEntries(
                  extraParts(layout)
                    .filter((id) => !id.startsWith("sc."))
                    .map((id) => [id, <ExtraWidgetCard key={id} id={id} state={extras} />])
                ),
              };
              const blocks = layoutBlocks(layout);
              if (blocks.length === 0) {
                return (
                  <DashboardDropZone>
                  <Card>
                    <div className="py-10 text-center">
                      <p className="text-sm text-zinc-500">Your dashboard is empty.</p>
                      <button
                        type="button"
                        onClick={() => setCustomizing(true)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                      >
                        <LayoutGrid className="h-4 w-4" /> Add widgets
                      </button>
                    </div>
                  </Card>
                  </DashboardDropZone>
                );
              }
              return (
                <DashboardDropZone>
                <SortableContext items={layout} strategy={rectSortingStrategy}>
                <div className={`grid gap-6 lg:grid-cols-3 ${state.loading ? "[&>*]:opacity-60" : ""}`}>
                  {blocks.map((block) =>
                    block.kind === "scorecards" ? (
                      <div key={`sc-${block.ids[0]}`} className="lg:col-span-3">
                        <Card title="Summary">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                            {block.ids.map((id) => (
                              <SortableWidget key={id} id={id} title={WIDGET_BY_ID.get(id)?.title ?? id}>
                                {s && <ScorecardFor id={id} s={s} extras={extras.data} />}
                              </SortableWidget>
                            ))}
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <SortableWidget
                        key={block.id}
                        id={block.id}
                        title={WIDGET_BY_ID.get(block.id)?.title ?? block.id}
                        className={WIDGET_BY_ID.get(block.id)?.size === "third" ? "min-w-0" : "min-w-0 lg:col-span-3"}
                      >
                        {cards[block.id]}
                      </SortableWidget>
                    )
                  )}
                </div>
                </SortableContext>
                </DashboardDropZone>
              );
            }}
          </Breakdowns>
        )}
      </main>
      <WidgetSidebar
        open={customizing}
        layout={layout ?? DEFAULT_LAYOUT}
        onToggle={toggleWidget}
        onReset={resetWidgets}
        onClose={closeSidebar}
        status={saveStatus}
      />
      <DragOverlay>
        {dragging && (
          <div className="rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-lg">
            {WIDGET_BY_ID.get(dragging.replace(NEW_PREFIX, ""))?.title ?? "Widget"}
          </div>
        )}
      </DragOverlay>
      </DndContext>
    </>
  );
}
