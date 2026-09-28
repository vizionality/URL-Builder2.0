"use client";

import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bot, Loader2, ShieldAlert } from "lucide-react";
import { Card } from "@/components/Card";
import { DateRangePicker, resolveRange, type DateValue } from "@/components/dashboard/DateRangePicker";
import { api } from "@/lib/client-scope";
import { compact, presetRange } from "@/lib/report";
import { getCached, setCached } from "@/lib/response-cache";
import type { BotDimension, Scored } from "@/lib/bot-signals";

type Data = {
  totals: { sessions: number; engagedSessions: number };
  flaggedLocationSessions: number;
  days: { date: string; sessions: number; engagedSessions: number; spike: boolean }[];
  segments: Record<BotDimension, Scored[]>;
};

const SECTIONS: { id: BotDimension; title: string; label: string }[] = [
  { id: "country", title: "Countries", label: "Country" },
  { id: "city", title: "Cities", label: "City" },
  { id: "sourceMedium", title: "Source / medium", label: "Source / medium" },
  { id: "browser", title: "Browsers", label: "Browser" },
  { id: "screenResolution", title: "Screen sizes", label: "Screen" },
  { id: "landingPage", title: "Landing pages", label: "Landing page" },
];

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

// Bot Detection tab: GA4 traffic segments scored on bot signals.
export function BotDetection() {
  const [today] = useState(localToday);
  const [dates, setDates] = useState<DateValue>(() => ({ preset: "last28", includeToday: false, custom: presetRange("last28", today)! }));
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const range = resolveRange(dates, today);
  const endDate = range.endDate > today ? today : range.endDate;
  const url = api(`/api/ga4/bots?startDate=${range.startDate}&endDate=${endDate}`);
  const [state, setState] = useState<{ url: string; data: Data | null; error: string | null } | null>(null);

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
        if (!r.ok) throw new Error(d.error);
        setCached(url, d);
        setState({ url, data: d, error: null });
      })
      .catch((e) => {
        if (!ac.signal.aborted) setState({ url, data: null, error: e instanceof Error && e.message ? e.message : "Couldn't load." });
      });
    return () => ac.abort();
  }, [url]);

  const loading = !state || state.url !== url;
  const d = state?.data ?? null;
  const unengaged = d ? d.totals.sessions - d.totals.engagedSessions : 0;
  const flaggedSegments = d ? Object.values(d.segments).flat().filter((s) => s.level !== "ok").length : 0;
  const spikes = d ? d.days.filter((x) => x.spike).length : 0;

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <p className="max-w-2xl text-sm text-zinc-500">
          GA4 already removes known bots. This finds traffic that still looks automated: no engagement, datacenter locations,
          headless-browser screen sizes and missing values.
        </p>
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
            <Stat label="Sessions" value={compact(d.totals.sessions)} />
            <Stat label="Unengaged sessions" value={compact(unengaged)} sub={d.totals.sessions ? `${pct(unengaged / d.totals.sessions)} of sessions` : undefined} />
            <Stat label="From datacenter-like cities" value={compact(d.flaggedLocationSessions)} sub={d.totals.sessions ? `${pct(d.flaggedLocationSessions / d.totals.sessions)} of sessions` : undefined} warn={d.flaggedLocationSessions > 0} />
            <Stat label="Suspicious segments" value={String(flaggedSegments)} sub={spikes ? `${spikes} spike day${spikes === 1 ? "" : "s"}` : "No spike days"} warn={flaggedSegments > 0} />
          </div>

          <Card title="Sessions vs engaged sessions" description="Red bars are days where unengaged traffic jumped well above normal, a common sign of a bot burst.">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.days.map((x) => ({ ...x, unengaged: x.sessions - x.engagedSessions, spikeBar: x.spike ? x.sessions - x.engagedSessions : 0 }))} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="#f1f5f4" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={(v) => compact(Number(v))} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="spikeBar" name="Spike (unengaged)" fill="#ef4444" isAnimationActive={false} />
                  <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#94a3b8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="engagedSessions" name="Engaged sessions" stroke="#12b795" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
            Only show bot and suspicious segments
          </label>

          <div className="grid gap-4 xl:grid-cols-2">
            {SECTIONS.map((sec) => (
              <Card key={sec.id} title={sec.title}>
                <SegmentTable rows={d.segments[sec.id] ?? []} label={sec.label} onlyFlagged={onlyFlagged} />
              </Card>
            ))}
          </div>

          <Card title="What to do about it">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-600">
              <li>GA4 can&apos;t delete past bot sessions. To leave them out of a report, filter by the flagged country, city or source.</li>
              <li>Block at the source: turn on Cloudflare Bot Fight Mode or a WAF rule for the flagged countries or datacenter networks.</li>
              <li>If one source or landing page is flagged, check for referral spam or an uptime monitor hitting that page, and exclude it in GA4 Admin &gt; Data streams &gt; Configure tag settings &gt; List unwanted referrals.</li>
              <li>Mark real conversions as key events so reports that matter (leads) aren&apos;t skewed by bot sessions.</li>
            </ul>
          </Card>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${warn ? "text-red-600" : "text-zinc-900"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

const th = "py-2 pr-3 text-left text-xs font-semibold text-zinc-500";
const td = "py-2 pr-3 text-sm text-zinc-700";

function SegmentTable({ rows, label, onlyFlagged }: { rows: Scored[]; label: string; onlyFlagged: boolean }) {
  const shown = (onlyFlagged ? rows.filter((r) => r.level !== "ok") : rows).slice(0, 15);
  if (shown.length === 0) {
    return <p className="py-6 text-center text-sm text-zinc-400">{onlyFlagged ? "Nothing suspicious here." : "No data in this range."}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className={th}>{label}</th>
            <th className={`${th} text-right`}>Sessions</th>
            <th className={`${th} text-right`}>Engaged</th>
            <th className={`${th} text-right`}>Sec / session</th>
            <th className={th}>Signal</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.value} className="border-b border-zinc-100 align-top">
              <td className={`${td} max-w-[220px] truncate`} title={r.value}>{r.value}</td>
              <td className={`${td} text-right tabular-nums`}>{r.sessions.toLocaleString("en-US")}</td>
              <td className={`${td} text-right tabular-nums`}>{pct(r.engagementRate)}</td>
              <td className={`${td} text-right tabular-nums`}>{r.secondsPerSession.toFixed(1)}</td>
              <td className={td}>
                {r.level === "ok" ? (
                  <span className="text-xs text-zinc-400">Looks normal</span>
                ) : (
                  <div>
                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${r.level === "bot" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                      {r.level === "bot" ? <Bot className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                      {r.level === "bot" ? "Likely bot" : "Suspicious"} · {r.score}
                    </span>
                    <p className="mt-0.5 text-xs text-zinc-500">{r.reasons.join(" · ")}</p>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
