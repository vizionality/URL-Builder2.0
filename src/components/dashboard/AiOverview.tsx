"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/Card";
import { DateRangePicker, resolveRange, type DateValue } from "@/components/dashboard/DateRangePicker";
import { presetRange } from "@/lib/report";
import { getCached, setCached } from "@/lib/response-cache";
import type { Overview } from "@/lib/ai-overview";

type Result = {
  overview: Overview;
  sources: { ga4: boolean; gsc: boolean };
  warnings: string[];
  generatedAt: string;
};

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// AI Overview: a written summary of GA4 + Search Console for the chosen range.
export function AiOverview() {
  const [today] = useState(localToday);
  const [dates, setDates] = useState<DateValue>(() => ({
    preset: "last28",
    includeToday: false,
    custom: presetRange("last28", today)!,
  }));
  const range = resolveRange(dates, today);
  const endDate = range.endDate > today ? today : range.endDate;
  const key = `ai-overview:${range.startDate}:${endDate}`;
  const [result, setResult] = useState<{ key: string; data: Result } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = result?.key === key ? result.data : getCached<Result>(key);

  async function generate(force = false) {
    if (!force && getCached<Result>(key)) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/ai/overview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ startDate: range.startDate, endDate }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to generate the overview.");
      setCached(key, d);
      setResult({ key, data: d });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate the overview.");
    } finally {
      setBusy(false);
    }
  }

  const o = shown?.overview;
  const sourceNames = shown
    ? [shown.sources.ga4 && "Google Analytics", shown.sources.gsc && "Search Console"].filter(Boolean).join(" + ")
    : "";

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => generate(Boolean(shown))}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {busy ? "Analyzing…" : shown ? "Regenerate" : "Generate overview"}
        </button>
        {shown && (
          <p className="text-xs text-zinc-500">
            From {sourceNames} · generated {new Date(shown.generatedAt).toLocaleString()}
          </p>
        )}
        <div className="ml-auto">
          <DateRangePicker value={dates} today={today} onChange={setDates} />
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {shown?.warnings?.map((w) => (
        <p key={w} className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{w}</p>
      ))}

      {!o ? (
        !busy && (
          <Card title="AI Overview" description="A written summary of your Google Analytics and Search Console performance.">
            <p className="text-sm text-zinc-600">
              Pick a date range and click <span className="font-medium">Generate overview</span>. Claude reads the
              totals, channels, sources, landing pages, search queries and pages for the range and the period before it,
              then summarizes what changed and what to do next.
            </p>
          </Card>
        )
      ) : (
        <div className={`space-y-4 transition-opacity ${busy ? "opacity-60" : ""}`}>
          <div className="rounded-xl border border-green-200 bg-green-50/50 p-5">
            <p className="text-lg font-semibold text-zinc-900">{o.headline}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{o.summary}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <List title="Wins" items={o.wins} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
            <List title="Watch out" items={o.concerns} icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
            <List title="Next steps" items={o.actions} icon={<Lightbulb className="h-4 w-4 text-blue-600" />} />
          </div>
          <p className="text-xs text-zinc-400">AI-generated from your connected data. Check key numbers on the Google Analytics and SEO tabs.</p>
        </div>
      )}
    </main>
  );
}

function List({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div className="h-full">
      <Card title={title}>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-400">Nothing notable.</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((t, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-zinc-700">
                <span className="mt-0.5 shrink-0">{icon}</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
