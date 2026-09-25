"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import type { Suggestion } from "@/lib/key-event-suggestions";

type Data = { events: { name: string; count: number }[]; keyEvents: string[]; suggestions: Suggestion[] };

// Shown when the property has no key events: its own events that look like
// conversions, each markable as a GA4 key event in one click.
export function KeyEventSuggestions({ startDate, endDate }: { startDate: string; endDate: string }) {
  const url = `/api/ga4/key-events?startDate=${startDate}&endDate=${endDate}`;
  const [state, setState] = useState<{ url: string; data: Data | null; error: string | null } | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [markError, setMarkError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch(url, { signal: ac.signal })
      .then(async (r) => {
        const d = await r.json();
        setState(r.ok ? { url, data: d, error: null } : { url, data: null, error: d.error ?? "Couldn't load events." });
      })
      .catch(() => !ac.signal.aborted && setState({ url, data: null, error: "Couldn't load events." }));
    return () => ac.abort();
  }, [url]);

  async function mark(name: string) {
    setMarking(name);
    setMarkError(null);
    const r = await fetch("/api/ga4/key-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: name }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setMarking(null);
    if (!r?.ok) setMarkError(d?.error ?? "Couldn't mark it as a key event.");
    else setMarked((m) => new Set(m).add(name));
  }

  if (!state || state.url !== url) {
    return <p className="flex items-center gap-2 py-4 text-sm text-zinc-400"><Loader2 size={14} className="animate-spin" /> Looking at your events…</p>;
  }
  if (!state.data) return <p className="py-4 text-sm text-zinc-500">{state.error}</p>;
  const { suggestions, events, keyEvents } = state.data;
  const shown = showAll ? suggestions : suggestions.slice(0, 5);

  return (
    <div className="rounded-lg border border-green-200 bg-green-50/40 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800">
        <Sparkles className="h-4 w-4 text-green-600" /> Suggested key events
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        {keyEvents.length === 0
          ? "No key events are marked on this property, so there are no conversions to report."
          : `None of your key events (${keyEvents.join(", ")}) happened in this range.`}{" "}
        These events from your site look like conversions. Marking one counts it from now on (GA4 doesn&apos;t apply
        it to past data).
      </p>
      {suggestions.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          None of your {events.length} events look like a conversion yet. Set up an event for your main goal (for example
          a <code className="rounded bg-zinc-100 px-1">generate_lead</code> on a thank-you page or form submit) in Google
          Tag Manager, then mark it here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-green-100">
          {shown.map((s) => {
            const done = marked.has(s.name);
            return (
              <li key={s.name} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-zinc-800">
                    <code className="truncate">{s.name}</code>
                    <span className={`rounded px-1.5 text-[11px] font-medium ${s.strength === "strong" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                      {s.strength === "strong" ? "Recommended" : "Worth considering"}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">{s.reason} {s.count.toLocaleString("en-US")} in this range.</p>
                </div>
                <button
                  type="button"
                  onClick={() => mark(s.name)}
                  disabled={done || marking !== null}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                    done ? "text-green-700" : "bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                  }`}
                >
                  {done ? <><Check className="h-3.5 w-3.5" /> Marked</> : marking === s.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Mark as key event"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {suggestions.length > 5 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-1 text-xs font-medium text-green-700 hover:underline">
          {showAll ? "Show fewer" : `Show all ${suggestions.length}`}
        </button>
      )}
      {markError && <p className="mt-2 text-xs text-red-600">{markError}</p>}
    </div>
  );
}
