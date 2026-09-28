"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CircleDot, Copy, Loader2, RefreshCw } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { BackToIntegrations } from "@/components/integrations/IntegrationIcons";
import { api } from "@/lib/client-scope";
import { useMe } from "@/lib/use-me";
import { atLeast } from "@/lib/roles";

type Settings = { key: string | null; events: string[]; storageReady?: boolean; lastTouch: string | null; lastConversion: string | null };

function ago(iso: string | null, now: number): string {
  if (!iso) return "never";
  const s = Math.round((now - Date.parse(iso)) / 1000);
  if (s < 90) return "just now";
  if (s < 5400) return `${Math.round(s / 60)} minutes ago`;
  if (s < 129600) return `${Math.round(s / 3600)} hours ago`;
  return `${Math.round(s / 86400)} days ago`;
}

// Attribution tracking setup: the client's one-line GTM snippet, the events
// that count as conversions, and whether data is arriving.
export default function AttributionTrackingPage() {
  const me = useMe();
  const isAdmin = me ? atLeast(me.role, "admin") : false;
  const [s, setS] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [extra, setExtra] = useState("");
  const [checkedAt, setCheckedAt] = useState(0);

  const load = useCallback(() => {
    fetch(api("/api/attribution/settings"))
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setS(d);
        setCheckedAt(Date.now());
        setExtra((d.events ?? []).join(", "));
      })
      .catch((e) => setError(e instanceof Error && e.message ? e.message : "Couldn't load."));
  }, []);
  useEffect(load, [load]);

  const snippet = s?.key && typeof window !== "undefined"
    ? `<script async src="${window.location.origin}/t.js?k=${s.key}"></script>`
    : "";

  async function createKey() {
    if (s?.key && !window.confirm("Replace the key? The snippet already installed on the site stops working until it's updated.")) return;
    setBusy(true);
    await fetch(api("/api/attribution/settings"), { method: "POST" }).catch(() => null);
    setBusy(false);
    load();
  }
  async function saveEvents() {
    const events = extra.split(/[\s,]+/).map((e) => e.trim()).filter(Boolean);
    await fetch(api("/api/attribution/settings"), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events }),
    }).catch(() => null);
    load();
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy the snippet:", snippet);
    }
  }

  const live = s?.lastTouch && checkedAt - Date.parse(s.lastTouch) < 86_400_000;

  return (
    <>
      <Header title="Attribution tracking" subtitle="Integration setup" />
      <main className="flex-1 space-y-6 px-4 py-6 sm:px-6">
        <BackToIntegrations />
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!s ? (
          !error && <p className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 size={14} className="animate-spin" /> Loading…</p>
        ) : (
          <>
            {s.storageReady === false && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Attribution storage (BigQuery) isn&apos;t connected yet, so visits aren&apos;t saved. Add the BIGQUERY_SA_KEY environment variable in Vercel and redeploy.
              </p>
            )}
            <Card
              title="1. Tracking snippet"
              description="Records every visitor's first touch and each later visit from a new source (not every page view), plus leads and purchases, in BigQuery for the Attribution tab."
            >
              {!s.key ? (
                isAdmin ? (
                  <button type="button" onClick={createKey} disabled={busy} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
                    {busy ? "Creating…" : "Create tracking snippet"}
                  </button>
                ) : (
                  <p className="text-sm text-zinc-500">An admin needs to create this client&apos;s snippet.</p>
                )
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <code className="min-w-0 flex-1 break-all rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-800">{snippet}</code>
                    <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                      {copied ? <><Check className="h-4 w-4 text-green-600" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
                    </button>
                  </div>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600">
                    <li>In Google Tag Manager, go to <b>Tags → New → Custom HTML</b> and paste the snippet.</li>
                    <li>Set the trigger to <b>All Pages</b> (or <b>Consent Initialization - All Pages</b> if you use a consent banner).</li>
                    <li>Save, then <b>Submit / Publish</b> the container.</li>
                  </ol>
                  <p className="text-xs text-zinc-500">
                    Respects Google consent mode: with a consent banner it waits until analytics storage is granted. It stores only a
                    random visitor id and the recent traffic source, no names, emails or IP addresses.
                  </p>
                  {isAdmin && (
                    <button type="button" onClick={createKey} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800">
                      <RefreshCw className="h-3 w-3" /> Replace key
                    </button>
                  )}
                </div>
              )}
            </Card>

            <Card title="2. What counts as a conversion" description="generate_lead and purchase (with its value, currency and transaction id) always count when they're pushed to the dataLayer or sent with gtag.">
              <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor="extra-events">Extra events</label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="extra-events"
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="e.g. form_submit, sign_up"
                  className="min-w-56 flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none disabled:bg-zinc-50"
                />
                {isAdmin && (
                  <button type="button" onClick={saveEvents} className="rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                    Save
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-400">Event names, separated by commas. Changes reach sites within about 5 minutes.</p>
            </Card>

            <Card title="3. Status">
              <p className={`flex items-center gap-2 text-sm ${live ? "text-green-700" : "text-zinc-600"}`}>
                <CircleDot className="h-4 w-4" />
                {live ? "Receiving data." : s.lastTouch ? "No visits recorded in the last 24 hours." : "Waiting for the first visit. Publish the GTM container, then open the site."}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Last visit recorded: {ago(s.lastTouch, checkedAt)} · Last conversion: {ago(s.lastConversion, checkedAt)}</p>
              <button type="button" onClick={load} className="mt-2 text-xs font-medium text-green-700 hover:underline">Check again</button>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
