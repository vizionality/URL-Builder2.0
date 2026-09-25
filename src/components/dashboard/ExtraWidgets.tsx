"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Card } from "@/components/Card";
import { compact } from "@/lib/report";
import { getCached, setCached } from "@/lib/response-cache";
import { WIDGET_BY_ID } from "@/lib/dashboard-widgets";
import type { ListData, TableData, WidgetData } from "@/lib/extra-widgets";

const GREEN = "#12b795";
const PIE_COLORS = ["#12b795", "#f59e0b", "#3b82f6", "#ec4899", "#22c55e", "#8b5cf6", "#14b8a6", "#eab308"];
const PIE_WIDGETS = new Set(["device", "newVsReturning"]);

export type ExtraState = { loading: boolean; error: string | null; data: Record<string, WidgetData> };

// Loads the extra widgets on the layout (one GA4 report each, batched on the
// server), with the page's dates and filters. Cached like the other reports.
export function useExtraWidgets(ids: string[], query: string, enabled: boolean): ExtraState {
  const idsKey = ids.join(",");
  const [state, setState] = useState<ExtraState>({ loading: false, error: null, data: {} });
  useEffect(() => {
    if (!enabled || !idsKey) return;
    const url = `/api/ga4/widgets?${query}&ids=${encodeURIComponent(idsKey)}`;
    const cached = getCached<Record<string, WidgetData>>(url);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- serve a cached report synchronously
      setState({ loading: false, error: null, data: cached });
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(url, { signal: ac.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load widgets.");
        return d.widgets as Record<string, WidgetData>;
      })
      .then((w) => {
        if (cancelled) return;
        setCached(url, w);
        setState({ loading: false, error: null, data: w });
      })
      .catch((e) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : "Failed to load widgets." }));
      });
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [idsKey, query, enabled]);
  return state;
}

// Card for one extra (non-scorecard) widget.
export function ExtraWidgetCard({ id, state }: { id: string; state: ExtraState }) {
  const def = WIDGET_BY_ID.get(id);
  const data = state.data[id];
  let body: React.ReactNode;
  if (!data) {
    body = state.error ? (
      <p className="py-6 text-sm text-red-600">{state.error}</p>
    ) : (
      <div className="flex items-center gap-2 py-10 text-zinc-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  } else if (data.kind === "list") {
    body = data.rows.length === 0
      ? <p className="py-10 text-center text-sm text-zinc-400">No data in this range.</p>
      : PIE_WIDGETS.has(id) ? <ListPie data={data} /> : id === "hourOfDay" ? <HourBars data={data} /> : <ListBars data={data} />;
  } else if (data.kind === "table") {
    body = <PagedTable data={data} labelHeader={id === "campaigns" ? "Campaign" : "Page title"} />;
  } else {
    body = null;
  }
  return (
    <div className={`h-full transition-opacity ${state.loading && data ? "opacity-60" : ""}`}>
      <Card title={def?.title} description={def?.description}>{body}</Card>
    </div>
  );
}

function ListPie({ data }: { data: ListData }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data.rows} dataKey="value" nameKey="label" cx="45%" cy="50%" outerRadius={90}>
            {data.rows.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ListBars({ data }: { data: ListData }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.rows} layout="vertical" margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="#f1f5f4" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => compact(Number(v))} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={100} />
          <Tooltip />
          <Bar name="Sessions" dataKey="value" fill={GREEN} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function HourBars({ data }: { data: ListData }) {
  // Every hour 0-23, zero-filled, labeled like "3 PM".
  const byHour = new Map(data.rows.map((r) => [Number(r.label), r.value]));
  const rows = Array.from({ length: 24 }, (_, h) => ({
    label: `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`,
    value: byHour.get(h) ?? 0,
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#f1f5f4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
          <YAxis tick={{ fontSize: 11 }} width={36} tickFormatter={(v) => compact(Number(v))} />
          <Tooltip />
          <Bar name="Sessions" dataKey="value" fill={GREEN} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const PER_PAGE = 10;
const th = "py-2 pr-3 text-left text-xs font-semibold text-zinc-500";
const td = "py-2 pr-3 text-sm text-zinc-700";

function PagedTable({ data, labelHeader }: { data: TableData; labelHeader: string }) {
  const [pageFor, setPageFor] = useState<{ data: TableData | null; page: number }>({ data: null, page: 0 });
  const count = Math.max(1, Math.ceil(data.rows.length / PER_PAGE));
  const page = pageFor.data === data ? Math.min(pageFor.page, count - 1) : 0;
  const start = page * PER_PAGE;
  const rows = data.rows.slice(start, start + PER_PAGE);
  if (data.rows.length === 0) return <p className="py-10 text-center text-sm text-zinc-400">No data in this range.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className={th}>{labelHeader}</th>
            {data.columns.map((c) => <th key={c} className={`${th} text-right`}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.label}-${i}`} className="border-b border-zinc-100">
              <td className={`${td} max-w-[320px] truncate`} title={r.label}>
                <span className="mr-1.5 text-zinc-400">{start + i + 1}.</span>{r.label}
              </td>
              {r.values.map((v, j) => (
                <td key={j} className={`${td} text-right tabular-nums`}>{v.toLocaleString("en-US")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>{start + 1}-{start + rows.length} of {data.rows.length}</span>
        {count > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={page === 0}
              onClick={() => setPageFor({ data, page: page - 1 })}
              className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">Page {page + 1} of {count}</span>
            <button type="button" aria-label="Next page" disabled={page >= count - 1}
              onClick={() => setPageFor({ data, page: page + 1 })}
              className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
