"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CircleAlert, Loader2, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { Header } from "@/components/Header";
import { GoogleAnalyticsIcon, SearchConsoleIcon } from "@/components/integrations/IntegrationIcons";
import { change, type Flag, type Metric } from "@/lib/client-health";
import { compact } from "@/lib/report";
import { getCached, setCached } from "@/lib/response-cache";

type Overview = {
  slug: string;
  name: string;
  domain: string | null;
  propertyName: string | null;
  gscSiteUrl: string | null;
  sessions: Metric | null;
  leads: Metric | null;
  clicks: Metric | null;
  daily: number[];
  flags: Flag[];
};

const URL = "/api/clients/overview";

// Where each flag's fix lives.
const FLAG_PATH: Record<string, string> = {
  google: "/integrations/google-analytics",
  ga4: "/integrations/google-analytics",
  keyEvents: "/dashboard",
  noTraffic: "/integrations/google-analytics",
  gsc: "/integrations/search-console",
  gscError: "/integrations/search-console",
};

// Clients overview (agency mode): one card per client with the last 28 days
// and anything that needs attention.
export default function ClientsPage() {
  const [data, setData] = useState<Overview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canAdd, setCanAdd] = useState(false);

  useEffect(() => {
    // Show the last result straight away while fresh numbers load.
    const cached = getCached<{ clients: Overview[] }>(URL);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- serve a cached report synchronously
    if (cached) setData(cached.clients);
    fetch(URL)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setCached(URL, d);
        setData(d.clients);
      })
      .catch((e) => setError(e instanceof Error && e.message ? e.message : "Couldn't load clients."));
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => setCanAdd(Boolean(d.canAddClient)))
      .catch(() => {});
  }, []);

  const needsAttention = (data ?? []).filter((c) => c.flags.some((f) => f.level === "error")).length;

  return (
    <>
      <Header title="Clients" subtitle="Last 28 days vs the 28 days before" />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {data && (
            <p className="text-sm text-zinc-500">
              {data.length} client{data.length === 1 ? "" : "s"}
              {needsAttention > 0 && <span className="text-red-600"> · {needsAttention} need attention</span>}
            </p>
          )}
          {canAdd && (
            <Link href="/clients/new" className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700">
              <Plus className="h-4 w-4" /> Add client
            </Link>
          )}
        </div>
        {error && !data && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!data && !error && (
          <p className="flex items-center gap-2 py-10 text-sm text-zinc-400"><Loader2 size={16} className="animate-spin" /> Loading clients…</p>
        )}
        {data && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.map((c) => <ClientCard key={c.slug} c={c} />)}
          </div>
        )}
      </main>
    </>
  );
}

function ClientCard({ c }: { c: Overview }) {
  const initials = c.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm">
      <Link href={`/c/${c.slug}/dashboard`} className="flex items-center gap-3 rounded-t-xl p-4 hover:bg-zinc-50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-sm font-semibold text-green-700">{initials}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-zinc-900">{c.name}</span>
          <span className="block truncate text-xs text-zinc-400">{c.domain || c.propertyName || "No website set"}</span>
        </span>
        <span className="flex items-center gap-1.5" aria-label="Connected sources">
          <GoogleAnalyticsIcon className={`h-5 w-5 ${c.propertyName ? "" : "opacity-20 grayscale"}`} />
          <SearchConsoleIcon className={`h-5 w-5 ${c.gscSiteUrl ? "" : "opacity-20 grayscale"}`} />
        </span>
      </Link>
      <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 px-4 py-3">
        <Stat label="Sessions" m={c.sessions} />
        <Stat label="Leads" m={c.leads} />
        <Stat label="Search clicks" m={c.clicks} />
      </div>
      <div className="px-4 pb-3">
        <Sparkline points={c.daily} />
        <Link href={`/c/${c.slug}/portal`} className="mt-1 inline-block text-xs font-medium text-green-700 hover:underline">
          Share client portal
        </Link>
      </div>
      {c.flags.length > 0 && (
        <ul className="mt-auto space-y-1 border-t border-zinc-100 px-4 py-3">
          {c.flags.map((f) => (
            <li key={f.id}>
              <Link
                href={`/c/${c.slug}${FLAG_PATH[f.id] ?? "/dashboard"}`}
                className={`flex items-start gap-1.5 text-xs hover:underline ${f.level === "error" ? "text-red-600" : "text-amber-700"}`}
              >
                {f.level === "error" ? <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />}
                {f.text}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, m }: { label: string; m: Metric | null }) {
  const d = change(m);
  return (
    <div>
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-zinc-900">{m ? compact(m.current) : "—"}</p>
      {d != null ? (
        <p className={`flex items-center gap-0.5 text-[11px] ${d >= 0 ? "text-green-600" : "text-red-600"}`}>
          {d >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(d).toFixed(0)}%
        </p>
      ) : (
        <p className="text-[11px] text-zinc-300">no prior data</p>
      )}
    </div>
  );
}

// Daily sessions, last 28 days.
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <div className="h-10" />;
  const max = Math.max(...points, 1);
  const w = 100;
  const h = 32;
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(2)},${(h - (v / max) * (h - 2) - 1).toFixed(2)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-10 w-full" aria-label="Daily sessions, last 28 days">
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="#12b795" opacity="0.12" />
      <path d={d} fill="none" stroke="#12b795" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
