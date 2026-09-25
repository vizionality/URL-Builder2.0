"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { Card } from "@/components/Card";
import { DateRangePicker, resolveRange, type DateValue } from "@/components/dashboard/DateRangePicker";
import { compact, pctDelta, presetRange } from "@/lib/report";
import { getCached, setCached } from "@/lib/response-cache";
import { pagePath, siteLabel, type GscDay, type GscItem, type GscTotals } from "@/lib/gsc-report";

type Report = {
  siteUrl: string;
  totals: GscTotals;
  previous: GscTotals;
  daily: GscDay[];
  queries: GscItem[];
  pages: GscItem[];
  countries: GscItem[];
  devices: GscItem[];
};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const pos = (v: number) => v.toFixed(1);
const int = (v: number) => Math.round(v).toLocaleString("en-US");

// SEO Dashboard: Google Search Console performance for the saved site.
export function SeoDashboard() {
  const [today] = useState(localToday);
  const [dates, setDates] = useState<DateValue>(() => ({
    preset: "last28",
    includeToday: false,
    custom: presetRange("last28", today)!,
  }));
  const range = resolveRange(dates, today);
  const endDate = range.endDate > today ? today : range.endDate;
  const url = `/api/gsc/report?startDate=${range.startDate}&endDate=${endDate}`;
  const [state, setState] = useState<{ url: string; data: Report | null; error: string | null; code?: string } | null>(null);

  useEffect(() => {
    const cached = getCached<Report>(url);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- serve a cached report synchronously
      setState({ url, data: cached, error: null });
      return;
    }
    const ac = new AbortController();
    fetch(url, { signal: ac.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          setState({ url, data: null, error: d.error ?? "Failed to load Search Console data.", code: d.code });
          return;
        }
        setCached(url, d);
        setState({ url, data: d, error: null });
      })
      .catch((e) => {
        if (!ac.signal.aborted) setState({ url, data: null, error: e instanceof Error ? e.message : "Failed to load." });
      });
    return () => ac.abort();
  }, [url]);

  const loading = !state || state.url !== url;
  const d = state?.data ?? null;

  if (state?.code === "no_site" || state?.code === "access") {
    return (
      <main className="flex-1 px-4 py-6 sm:px-6">
        <Card title="Connect Google Search Console" description="See clicks, impressions, CTR and position from Google Search.">
          <p className="mb-3 text-sm text-zinc-600">{state.error}</p>
          <Link href="/integrations" className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            <Search size={16} /> Go to Integrations
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {d && <p className="text-sm text-zinc-500">Search Console: <span className="font-medium text-zinc-800">{siteLabel(d.siteUrl)}</span></p>}
        <div className="ml-auto flex items-center gap-2">
          {loading && d && <Loader2 size={16} className="animate-spin text-zinc-400" />}
          <DateRangePicker value={dates} today={today} onChange={setDates} />
        </div>
      </div>
      {state?.error && !d ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : !d ? (
        <div className="flex items-center gap-2 py-16 text-zinc-400"><Loader2 size={18} className="animate-spin" /><span className="text-sm">Loading…</span></div>
      ) : (
        <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Score label="Clicks" value={int(d.totals.clicks)} delta={pctDelta(d.totals.clicks, d.previous.clicks)} />
            <Score label="Impressions" value={compact(d.totals.impressions)} delta={pctDelta(d.totals.impressions, d.previous.impressions)} />
            <Score label="Average CTR" value={pct(d.totals.ctr)} delta={pctDelta(d.totals.ctr, d.previous.ctr)} />
            {/* Lower position is better, so a drop reads green. */}
            <Score label="Average position" value={pos(d.totals.position)} delta={pctDelta(d.totals.position, d.previous.position)} invert />
          </div>
          <Card title="Clicks and impressions" description="Daily, from Google Search. The last 2 to 3 days may still be filling in.">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.daily} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="#f1f5f4" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
                  <YAxis yAxisId="c" tick={{ fontSize: 11 }} width={40} tickFormatter={(v) => compact(Number(v))} />
                  <YAxis yAxisId="i" orientation="right" tick={{ fontSize: 11 }} width={44} tickFormatter={(v) => compact(Number(v))} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="c" type="monotone" dataKey="clicks" name="Clicks" stroke="#12b795" strokeWidth={2} dot={false} />
                  <Line yAxisId="i" type="monotone" dataKey="impressions" name="Impressions" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Top queries" description="Search terms that showed your site."><GscTable rows={d.queries} label="Query" /></Card>
            <Card title="Top pages" description="Pages that appeared in search."><GscTable rows={d.pages} label="Page" format={pagePath} /></Card>
            <Card title="Countries"><GscTable rows={d.countries} label="Country" format={(c) => c.toUpperCase()} /></Card>
            <Card title="Devices"><GscTable rows={d.devices} label="Device" format={(c) => c.charAt(0) + c.slice(1).toLowerCase()} /></Card>
          </div>
        </div>
      )}
    </main>
  );
}

function Score({ label, value, delta, invert }: { label: string; value: string; delta: number | null; invert?: boolean }) {
  const good = delta !== null && (invert ? delta < 0 : delta > 0);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
      <p className={`mt-1 text-xs ${delta === null || delta === 0 ? "text-zinc-400" : good ? "text-green-600" : "text-red-600"}`}>
        {delta === null ? "No prior data" : `${delta > 0 ? "▲" : delta < 0 ? "▼" : ""} ${Math.abs(delta * 100).toFixed(1)}% vs previous period`}
      </p>
    </div>
  );
}

const PER_PAGE = 10;
const th = "py-2 pr-3 text-left text-xs font-semibold text-zinc-500";
const td = "py-2 pr-3 text-sm text-zinc-700";

function GscTable({ rows, label, format = (s) => s }: { rows: GscItem[]; label: string; format?: (s: string) => string }) {
  const [pageFor, setPageFor] = useState<{ rows: GscItem[] | null; page: number }>({ rows: null, page: 0 });
  if (rows.length === 0) return <p className="py-10 text-center text-sm text-zinc-400">No data in this range.</p>;
  const count = Math.ceil(rows.length / PER_PAGE);
  const page = pageFor.rows === rows ? Math.min(pageFor.page, count - 1) : 0;
  const start = page * PER_PAGE;
  const shown = rows.slice(start, start + PER_PAGE);
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className={th}>{label}</th>
            <th className={`${th} text-right`}>Clicks</th>
            <th className={`${th} text-right`}>Impr.</th>
            <th className={`${th} text-right`}>CTR</th>
            <th className={`${th} text-right`}>Pos.</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={r.key} className="border-b border-zinc-100">
              <td className={`${td} max-w-[280px] truncate`} title={r.key}>
                <span className="mr-1.5 text-zinc-400">{start + i + 1}.</span>{format(r.key)}
              </td>
              <td className={`${td} text-right tabular-nums`}>{int(r.clicks)}</td>
              <td className={`${td} text-right tabular-nums`}>{int(r.impressions)}</td>
              <td className={`${td} text-right tabular-nums`}>{pct(r.ctr)}</td>
              <td className={`${td} text-right tabular-nums`}>{pos(r.position)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>{start + 1}-{start + shown.length} of {rows.length}</span>
        {count > 1 && (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPageFor({ rows, page: page - 1 })} className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="tabular-nums">Page {page + 1} of {count}</span>
            <button type="button" aria-label="Next page" disabled={page >= count - 1} onClick={() => setPageFor({ rows, page: page + 1 })} className="rounded p-1 hover:bg-zinc-100 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
