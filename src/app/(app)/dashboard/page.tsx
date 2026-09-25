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
import { LayoutGrid, Loader2, Redo2, TrendingUp, TrendingDown, Undo2, X } from "lucide-react";
import { Header } from "@/components/Header";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
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
  type TimeGrain,
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
import { DashboardDropZone, GapSlot, SortableWidget } from "@/components/dashboard/DragParts";
import { ExtraWidgetCard, useExtraWidgets } from "@/components/dashboard/ExtraWidgets";
import { ChartWidgetCard, formatMetric } from "@/components/dashboard/ChartWidget";
import { CHART_WIDGET_BY_ID, isChartWidget, METRIC_PICK_CHARTS, TIME_CHART_TYPES, type ChartData } from "@/lib/chart-widgets";
import type { WidgetData } from "@/lib/extra-widgets";
import {
  DASHBOARD_DROP,
  dropWithSpans,
  normalizeLayout,
  packRows,
  removeWidget,
  parseLayout,
  removeGap,
  resizeWithGap,
  serializeLayout,
  SIDEBAR_DROP,
  spanOf,
  type Span,
  type Spans,
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
// A dashboard widget let go over empty dashboard space (e.g. the gap below
// Summary) goes to the nearest widget instead of being ignored; a new catalog
// item dropped there is added at the end.
const dropCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const widgets = hits.filter((h) => !String(h.id).startsWith("drop:"));
  if (widgets.length) return widgets;
  const nearestWidget = () =>
    closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => !String(c.id).startsWith("drop:")),
    });
  if (hits.some((h) => h.id === SIDEBAR_DROP)) return hits.filter((h) => h.id === SIDEBAR_DROP);
  const fromCatalog = String(args.active.id).startsWith(NEW_PREFIX);
  if (hits.some((h) => h.id === DASHBOARD_DROP)) {
    return fromCatalog ? hits.filter((h) => h.id === DASHBOARD_DROP) : nearestWidget();
  }
  return nearestWidget();
};

type LayoutSnapshot = { ids: string[]; spans: Spans };
const HISTORY_LIMIT = 50;

type Scorecards = Overview["scorecards"];
const EXTRA_SCORE_LABELS: Record<string, string> = {
  "sc.bounceRate": "Bounce rate",
  "sc.pagesPerSession": "Views per session",
  "sc.engagedSessions": "Engaged sessions",
  "sc.eventCount": "Event count",
  "sc.keyEvents": "Key events",
};
// One summary scorecard by widget id.
function ScorecardFor({
  id,
  s,
  extras,
  large = false,
}: {
  id: string;
  s: Scorecards;
  extras: Record<string, WidgetData | ChartData>;
  // A scorecard placed on its own in a row: centered, larger value.
  large?: boolean;
}) {
  const card = (label: string, value: string, delta: number | null, invert = false) => (
    <Scorecard label={label} value={value} delta={delta} invert={invert} large={large} />
  );
  // Scorecards fetched per widget: the extra ones and every "Number" chart widget.
  const label = EXTRA_SCORE_LABELS[id] ?? (isChartWidget(id) ? WIDGET_BY_ID.get(id)?.title : undefined);
  if (label) {
    const extra = extras[id];
    if (!extra || extra.kind !== "score") return card(label, "…", null);
    // A falling bounce rate is good news.
    return card(label, formatMetric(extra.value, extra.format), pctDelta(extra.value, extra.prev), id.endsWith("bounceRate"));
  }
  switch (id) {
    case "sc.views": return card("Views", compact(s.views.value), pctDelta(s.views.value, s.views.prev));
    case "sc.totalUsers": return card("Total users", compact(s.totalUsers.value), pctDelta(s.totalUsers.value, s.totalUsers.prev));
    case "sc.newUsers": return card("New users", compact(s.newUsers.value), pctDelta(s.newUsers.value, s.newUsers.prev));
    case "sc.sessions": return card("Sessions", compact(s.sessions.value), pctDelta(s.sessions.value, s.sessions.prev));
    case "sc.engagementRate": return card("Engagement rate", `${s.engagementRate.value.toFixed(1)}%`, pctDelta(s.engagementRate.value, s.engagementRate.prev));
    case "sc.avgSessionDuration": return card("Avg session duration", formatDuration(s.avgSessionDuration.value), pctDelta(s.avgSessionDuration.value, s.avgSessionDuration.prev));
    case "sc.generateLead": return card("Generate Lead", compact(s.generateLead.value), pctDelta(s.generateLead.value, s.generateLead.prev));
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

function Scorecard({
  label,
  value,
  delta,
  invert,
  large = false,
}: {
  label: string;
  value: string;
  delta: number | null;
  invert?: boolean;
  large?: boolean;
}) {
  if (large) {
    // On its own in a row: the number is the point, so center it and size it up.
    return (
      <div className="flex h-full min-h-40 flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="pr-6 text-sm text-zinc-500">{label}</p>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-4">
          <p className="text-5xl font-semibold text-zinc-900">{value}</p>
          <Delta value={delta} invert={invert} />
        </div>
      </div>
    );
  }
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
  // Custom widths (12ths of the row) for widgets not at their default.
  const [spans, setSpans] = useState<Spans>({});
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
        const raw = parseLayout(Array.isArray(d.widgets) ? d.widgets : DEFAULT_LAYOUT);
        // Show any unused row space as empty slots.
        const parsed = normalizeLayout(raw.ids, raw.spans);
        setLayout(parsed.ids);
        setSpans(parsed.spans);
        if (d.saveUnavailable) setSaveStatus("unavailable");
      })
      .catch(() => !cancelled && setLayout(DEFAULT_LAYOUT));
    return () => {
      cancelled = true;
    };
  }, [propertyId]);
  // Save shortly after the last change, so several quick toggles are one write.
  const saveLayout = useCallback((next: string[], nextSpans: Spans, restore = false) => {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/dashboard/layout", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        // restore: true gives a restore its own history version.
        body: JSON.stringify({ widgets: serializeLayout(next, nextSpans), restore }),
      })
        .then((r) => setSaveStatus(r.ok ? "saved" : "error"))
        .catch(() => setSaveStatus("error"));
    }, 600);
  }, []);
  // Undo / redo: every layout change pushes the previous layout (last 50,
  // this visit only). Stepping back also saves, so a reload keeps it.
  const [history, setHistory] = useState<{ past: LayoutSnapshot[]; future: LayoutSnapshot[] }>({
    past: [],
    future: [],
  });
  const persistLayout = useCallback(
    (rawIds: string[], rawSpans: Spans, restore = false) => {
      // Every change keeps rows explicit: unused width becomes an empty slot.
      const { ids: next, spans: nextSpans } = normalizeLayout(rawIds, rawSpans);
      if (layout) {
        const prev = { ids: layout, spans };
        setHistory((h) => ({ past: [...h.past, prev].slice(-HISTORY_LIMIT), future: [] }));
      }
      setLayout(next);
      setSpans(nextSpans);
      saveLayout(next, nextSpans, restore);
    },
    [layout, spans, saveLayout]
  );
  // Restore a saved version (undoable like any other change).
  const restoreVersion = useCallback(
    (widgets: string[]) => {
      const v = parseLayout(widgets);
      persistLayout(v.ids, v.spans, true);
    },
    [persistLayout]
  );
  const undo = useCallback(() => {
    const prev = history.past[history.past.length - 1];
    if (!prev || !layout) return;
    setHistory({ past: history.past.slice(0, -1), future: [{ ids: layout, spans }, ...history.future] });
    setLayout(prev.ids);
    setSpans(prev.spans);
    saveLayout(prev.ids, prev.spans);
  }, [history, layout, spans, saveLayout]);
  const redo = useCallback(() => {
    const next = history.future[0];
    if (!next || !layout) return;
    setHistory({ past: [...history.past, { ids: layout, spans }], future: history.future.slice(1) });
    setLayout(next.ids);
    setSpans(next.spans);
    saveLayout(next.ids, next.spans);
  }, [history, layout, spans, saveLayout]);
  // Cmd/Ctrl+Z undoes, Shift+Cmd/Ctrl+Z or Ctrl+Y redoes (not while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);
  const toggleWidget = useCallback(
    (id: string) => {
      const cur = layout ?? DEFAULT_LAYOUT;
      // A newly added widget goes at the end.
      if (cur.includes(id)) {
        // Its space stays as an empty slot, so the rows below don't shift.
        const next = removeWidget(cur, spans, id);
        persistLayout(next.ids, next.spans);
      } else {
        persistLayout([...cur, id], spans);
      }
    },
    [layout, spans, persistLayout]
  );
  const resizeWidget = useCallback(
    (id: string, span: Span) => {
      if (!layout) return;
      const next = resizeWithGap(layout, spans, id, span);
      persistLayout(next.ids, next.spans);
    },
    [layout, spans, persistLayout]
  );
  // Reset is a normal change, so it can be undone.
  const resetWidgets = useCallback(() => persistLayout(DEFAULT_LAYOUT, {}), [persistLayout]);
  const dropGap = useCallback(
    (gap: string) => {
      if (!layout) return;
      const next = removeGap(layout, spans, gap);
      persistLayout(next.ids, next.spans);
    },
    [layout, spans, persistLayout]
  );
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
  // Each donut / pie / bar / map card's chosen metric, remembered in this browser.
  const [chartMetrics, setChartMetrics] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("dashboardChartMetrics") ?? "{}");
    } catch {
      return {};
    }
  });
  const setChartMetric = useCallback((id: string, metric: string) => {
    setChartMetrics((cur) => {
      const next = { ...cur, [id]: metric };
      try {
        localStorage.setItem("dashboardChartMetrics", JSON.stringify(next));
      } catch {
        // Storage blocked: the choice just won't survive a reload.
      }
      return next;
    });
  }, []);
  // Each time chart's grain (day / week / month / quarter), remembered the same way.
  const [chartGrains, setChartGrains] = useState<Record<string, TimeGrain>>(() => {
    try {
      return JSON.parse(localStorage.getItem("dashboardChartGrains") ?? "{}");
    } catch {
      return {};
    }
  });
  const setChartGrain = useCallback((id: string, grain: TimeGrain) => {
    setChartGrains((cur) => {
      const next = { ...cur, [id]: grain };
      try {
        localStorage.setItem("dashboardChartGrains", JSON.stringify(next));
      } catch {
        // Storage blocked: the choice just won't survive a reload.
      }
      return next;
    });
  }, []);
  // Request id for a chart widget: carries its metric and grain when the card has them.
  const chartRequestId = useCallback(
    (id: string) => {
      const def = CHART_WIDGET_BY_ID.get(id);
      if (!def) return id;
      if (METRIC_PICK_CHARTS.includes(def.chart)) return `${id}~${chartMetrics[id] ?? "sessions"}`;
      const grain = chartGrains[id] ?? "day";
      return TIME_CHART_TYPES.includes(def.chart) && grain !== "day" ? `${id}@${grain}` : id;
    },
    [chartMetrics, chartGrains]
  );
  const extras = useExtraWidgets(
    layout ? extraParts(layout).map(chartRequestId) : [],
    extraQuery,
    Boolean(propertyId && layout)
  );

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
      <DashboardTabs />
      <DndContext
        sensors={dndSensors}
        collisionDetection={dropCollision}
        onDragStart={(e) => setDragging(String(e.active.id))}
        onDragCancel={() => setDragging(null)}
        onDragEnd={(e) => {
          setDragging(null);
          if (!layout) return;
          const next = dropWithSpans(layout, spans, String(e.active.id), e.over ? String(e.over.id) : null);
          if (next.ids !== layout || next.spans !== spans) persistLayout(next.ids, next.spans);
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
            <DateRangePicker value={dates} today={today} onChange={setDates} />
            <select value={compare} onChange={(e) => setCompare(e.target.value as CompareMode)} className={inputClass} aria-label="Compare to">
              <option value="period">vs. previous period</option>
              <option value="year">vs. previous year</option>
            </select>
            <div className="flex items-center rounded-md border border-zinc-200 bg-white">
              <button
                type="button"
                onClick={undo}
                disabled={history.past.length === 0}
                aria-label="Undo layout change"
                title="Undo (Ctrl/Cmd+Z)"
                className="p-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={history.future.length === 0}
                aria-label="Redo layout change"
                title="Redo (Shift+Ctrl/Cmd+Z)"
                className="border-l border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
              >
                <Redo2 className="h-4 w-4" />
              </button>
            </div>
            {/* Primary action, last in the row (right of the date controls). */}
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700"
            >
              <LayoutGrid className="h-4 w-4" /> Customize
            </button>
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
                    .filter((id) => !id.startsWith("sc.") && !isChartWidget(id))
                    .map((id) => [id, <ExtraWidgetCard key={id} id={id} state={extras} />])
                ),
                ...Object.fromEntries(
                  layout
                    .filter((id) => isChartWidget(id) && !id.startsWith("c.number."))
                    .map((id) => [
                      id,
                      <ChartWidgetCard
                        key={id}
                        id={id}
                        data={extras.data[chartRequestId(id)] as ChartData | undefined}
                        loading={extras.loading}
                        error={extras.error}
                        metric={chartMetrics[id] ?? "sessions"}
                        onMetric={(m) => setChartMetric(id, m)}
                        grain={chartGrains[id] ?? "day"}
                        onGrain={(g) => setChartGrain(id, g)}
                        query={geoQuery}
                      />,
                    ])
                ),
              };
              const blocks = layoutBlocks(layout, spans);
              const rowLast = new Set(packRows(layout, spans).map((r) => r[r.length - 1]));
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
                <div className={`grid gap-6 lg:grid-cols-12 ${state.loading ? "[&>*]:opacity-60" : ""}`}>
                  {blocks.map((block) =>
                    block.kind === "scorecards" ? (
                      <div key={`sc-${block.ids[0]}`} className="lg:col-span-12">
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
                    ) : block.kind === "gap" ? (
                      <GapSlot
                        key={block.id}
                        id={block.id}
                        span={spanOf(block.id, spans)}
                        onAdd={() => setCustomizing(true)}
                        onRemove={
                          // A slot at the end of its row is just the row's free space.
                          rowLast.has(block.id) ? undefined : () => dropGap(block.id)
                        }
                      />
                    ) : (
                      <SortableWidget
                        key={block.id}
                        id={block.id}
                        title={WIDGET_BY_ID.get(block.id)?.title ?? block.id}
                        className="min-w-0"
                        span={spanOf(block.id, spans)}
                        onResize={(sp) => resizeWidget(block.id, sp)}
                      >
                        {cards[block.id] ??
                          // A scorecard placed on its own in a row.
                          (s && <ScorecardFor id={block.id} s={s} extras={extras.data} large />)}
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
        savedLayout={serializeLayout(layout ?? DEFAULT_LAYOUT, spans)}
        onRestore={restoreVersion}
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
