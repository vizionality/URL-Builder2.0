"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/Card";
import { DateRangePicker, resolveRange, type DateValue } from "@/components/dashboard/DateRangePicker";
import { api, useClientPath } from "@/lib/client-scope";
import { compact, presetRange } from "@/lib/report";
import { getCached, setCached } from "@/lib/response-cache";
import { MODELS, type AttributionResult, type Model } from "@/lib/attribution";

type Acquisition = { channel: string; visitors: number; converters: number; daysToConvert: number | null };
type Data = AttributionResult & {
  lookback: number;
  eventNames: string[];
  truncated: boolean;
  acquisition: Acquisition[];
  newVisitors: number;
};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const money = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });
const selectClass = "rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-green-500 focus:outline-none";

// Attribution tab: conversions from the tracking snippet, credited to channels
// and campaigns under six models side by side.
export function AttributionReport() {
  const to = useClientPath();
  const [today] = useState(localToday);
  const [dates, setDates] = useState<DateValue>(() => ({ preset: "last28", includeToday: true, custom: presetRange("last28", today, true)! }));
  const [lookback, setLookback] = useState(30);
  const [metric, setMetric] = useState<"conversions" | "revenue">("conversions");
  const [group, setGroup] = useState<"channel" | "campaign">("channel");
  const [event, setEvent] = useState("");
  const [focus, setFocus] = useState<Model>("position");
  const range = resolveRange(dates, today);
  const endDate = range.endDate > today ? today : range.endDate;
  const url = api(`/api/attribution?startDate=${range.startDate}&endDate=${endDate}&lookback=${lookback}${event ? `&events=${event}` : ""}`);
  const [state, setState] = useState<{ url: string; data: Data | null; error: string | null; code?: string } | null>(null);

  useEffect(() => {
    const cached = getCached<Data>(url);
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
          setState({ url, data: null, error: d.error ?? "Couldn't load.", code: d.code });
          return;
        }
        setCached(url, d);
        setState({ url, data: d, error: null });
      })
      .catch((e) => !ac.signal.aborted && setState({ url, data: null, error: e instanceof Error && e.message ? e.message : "Couldn't load." }));
    return () => ac.abort();
  }, [url]);

  // Whether the snippet is installed, to word the empty state.
  const [setup, setSetup] = useState<{ key: string | null; lastTouch: string | null } | null>(null);
  const empty = !!state?.data && state.data.conversions === 0 && state.data.newVisitors === 0;
  useEffect(() => {
    if (!empty || setup) return;
    fetch(api("/api/attribution/settings"))
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => s && setSetup({ key: s.key ?? null, lastTouch: s.lastTouch ?? null }))
      .catch(() => {});
  }, [empty, setup]);

  const loading = !state || state.url !== url;
  const d = state?.data ?? null;
  const rows = d ? (group === "channel" ? d.byChannel : d.byCampaign).slice(0, 25) : [];
  const fmt = (v: number) => (metric === "revenue" ? `$${money(v)}` : v.toFixed(v < 10 && v % 1 ? 1 : 0));
  const maxFocus = Math.max(1, ...rows.map((r) => r.credit[focus][metric]));

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <select value={group} onChange={(e) => setGroup(e.target.value as "channel" | "campaign")} className={selectClass} aria-label="Group by">
          <option value="channel">By source / medium</option>
          <option value="campaign">By campaign</option>
        </select>
        <select value={metric} onChange={(e) => setMetric(e.target.value as "conversions" | "revenue")} className={selectClass} aria-label="Metric">
          <option value="conversions">Conversions</option>
          <option value="revenue">Revenue</option>
        </select>
        <select value={event} onChange={(e) => setEvent(e.target.value)} className={selectClass} aria-label="Conversion event">
          <option value="">All conversions</option>
          {(d?.eventNames ?? []).map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={lookback} onChange={(e) => setLookback(Number(e.target.value))} className={selectClass} aria-label="Lookback window">
          {[7, 30, 60, 90].map((n) => <option key={n} value={n}>{n}-day lookback</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          {loading && d && <Loader2 size={16} className="animate-spin text-zinc-400" />}
          <DateRangePicker value={dates} today={today} onChange={setDates} />
        </div>
      </div>

      {state?.error && !d ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.code === "no_bigquery" ? "Attribution storage isn't set up yet. Add the BigQuery service account key (BIGQUERY_SA_KEY) in Vercel." : state.error}
        </p>
      ) : !d ? (
        <div className="flex items-center gap-2 py-16 text-zinc-400"><Loader2 size={18} className="animate-spin" /><span className="text-sm">Loading…</span></div>
      ) : d.conversions === 0 && d.newVisitors === 0 ? (
        setup?.key ? (
          <Card title={setup.lastTouch ? "No conversions in this range yet" : "Tracking is set up, waiting for data"}>
            <p className="text-sm text-zinc-600">
              {setup.lastTouch
                ? `The snippet is working (last visit recorded ${new Date(setup.lastTouch).toLocaleString()}). Leads and purchases will show here as they happen. Try a wider date range.`
                : "The snippet is installed but no visits have arrived yet. Make sure the GTM container is published, then visit the site to test."}
            </p>
            <Link href={to("/integrations/attribution")} className="mt-3 inline-block rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              View tracking status
            </Link>
          </Card>
        ) : (
        <Card title="No conversions recorded yet">
          <p className="text-sm text-zinc-600">
            Attribution uses the one-line tracking snippet. Install it in the client&apos;s Google Tag Manager, and leads and purchases
            will show here with every touch that led to them.
          </p>
          <Link href={to("/integrations/attribution")} className="mt-3 inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Set up tracking
          </Link>
        </Card>
        )
      ) : (
        <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat label="New visitors" value={compact(d.newVisitors)} sub="First touch in this range" />
            <Stat label="Conversions" value={compact(d.conversions)} sub={d.unattributed ? `${d.unattributed} without a recorded visit` : undefined} />
            <Stat label="Revenue" value={`$${money(d.revenue)}`} />
            <Stat label="Avg touches to convert" value={d.avgTouches.toFixed(1)} />
            <Stat label="Avg days to convert" value={d.avgDays.toFixed(1)} />
          </div>

          <Card
            title={`${metric === "revenue" ? "Revenue" : "Conversions"} credited ${group === "channel" ? "by source / medium" : "by campaign"}`}
            description="Each column is a different way of sharing credit across the touches before a conversion. Click a model to sort and chart by it."
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200">
                    <th className="py-2 pr-3 text-left text-xs font-semibold text-zinc-500">{group === "channel" ? "Source / medium" : "Campaign"}</th>
                    {MODELS.map((m) => (
                      <th key={m.id} className="py-2 pr-3 text-right text-xs font-semibold">
                        <button
                          type="button"
                          title={m.description}
                          onClick={() => setFocus(m.id)}
                          className={focus === m.id ? "text-green-700 underline" : "text-zinc-500 hover:text-zinc-800"}
                        >
                          {m.label}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...rows].sort((a, b) => b.credit[focus][metric] - a.credit[focus][metric]).map((r) => (
                    <tr key={r.key} className="border-b border-zinc-100">
                      <td className="py-2 pr-3 text-sm text-zinc-700">
                        <p className="max-w-[260px] truncate" title={r.key}>{r.key}</p>
                        <div className="mt-1 h-1.5 w-full max-w-[260px] rounded-full bg-zinc-100">
                          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${(r.credit[focus][metric] / maxFocus) * 100}%` }} />
                        </div>
                      </td>
                      {MODELS.map((m) => (
                        <td key={m.id} className={`py-2 pr-3 text-right text-sm tabular-nums ${focus === m.id ? "font-semibold text-zinc-900" : "text-zinc-600"}`}>
                          {fmt(r.credit[m.id][metric])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="Acquisition by first touch"
            description="Visitors whose first ever recorded visit was in this range, by the channel that first brought them, and how many of them converted."
          >
            {d.acquisition.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-400">No new visitors in this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 text-xs font-semibold text-zinc-500">
                      <th className="py-2 pr-3 text-left">First touch (source / medium)</th>
                      <th className="py-2 pr-3 text-right">New visitors</th>
                      <th className="py-2 pr-3 text-right">Converted</th>
                      <th className="py-2 pr-3 text-right">Conversion rate</th>
                      <th className="py-2 pr-3 text-right">Days to convert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.acquisition.slice(0, 25).map((a) => (
                      <tr key={a.channel} className="border-b border-zinc-100 text-sm">
                        <td className="max-w-[260px] truncate py-2 pr-3 text-zinc-700" title={a.channel}>{a.channel}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-zinc-700">{a.visitors.toLocaleString("en-US")}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-zinc-700">{a.converters.toLocaleString("en-US")}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-zinc-700">{a.visitors ? ((a.converters / a.visitors) * 100).toFixed(1) : "0.0"}%</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-zinc-500">{a.daysToConvert == null ? "—" : a.daysToConvert.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Top conversion paths" description={`The touches before each conversion, oldest first, within the ${d.lookback}-day lookback.`}>
            <ul className="divide-y divide-zinc-100">
              {d.paths.map((p) => (
                <li key={p.path} className="flex items-center gap-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-zinc-700" title={p.path}>{p.path}</span>
                  <span className="shrink-0 tabular-nums text-zinc-500">{p.conversions} conv.</span>
                  {p.revenue > 0 && <span className="shrink-0 tabular-nums text-zinc-500">${money(p.revenue)}</span>}
                </li>
              ))}
            </ul>
          </Card>
          {d.truncated && <p className="text-xs text-amber-700">Showing the first 20,000 conversions in this range. Pick a shorter range for complete numbers.</p>}
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}
