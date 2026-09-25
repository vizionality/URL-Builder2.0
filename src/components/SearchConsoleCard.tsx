"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/Card";
import { siteLabel } from "@/lib/gsc-report";

const selectClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

type Sites = { connected?: boolean; sites: { siteUrl: string }[]; siteUrl: string | null; error?: string };

// Integrations card: pick the Search Console site for the SEO Dashboard.
// Uses the same Google connection as GA4.
export function SearchConsoleCard({ googleConnected }: { googleConnected: boolean }) {
  const [data, setData] = useState<Sites | null>(null);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!googleConnected) return;
    let cancelled = false;
    fetch("/api/gsc/sites")
      .then((r) => r.json())
      .then((d: Sites) => {
        if (cancelled) return;
        setData(d);
        setSelected(d.siteUrl ?? "");
      })
      .catch(() => !cancelled && setData({ sites: [], siteUrl: null, error: "Failed to load Search Console sites." }));
    return () => {
      cancelled = true;
    };
  }, [googleConnected]);

  async function save() {
    setStatus("saving");
    const r = await fetch("/api/gsc/site", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteUrl: selected || null }),
    }).catch(() => null);
    setStatus(r?.ok ? "saved" : "error");
    if (r?.ok) setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <Card title="Google Search Console" description="Clicks, impressions, CTR and position from Google Search, shown on the SEO Dashboard.">
      {!googleConnected ? (
        <p className="text-sm text-zinc-500">Connect Google Analytics first. Search Console uses the same Google connection.</p>
      ) : data === null ? (
        <p className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 size={14} className="animate-spin" /> Loading sites…</p>
      ) : data.error ? (
        <div className="space-y-3">
          <p className="text-sm text-red-600">{data.error}</p>
          <a href="/api/ga4/oauth/start?return=search-console" className="inline-flex rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
            Reconnect Google
          </a>
        </div>
      ) : data.sites.length === 0 ? (
        <p className="text-sm text-zinc-500">This Google account has no verified Search Console sites.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700" htmlFor="gsc-site">Search Console site</label>
            <select id="gsc-site" className={selectClass} value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Select a site…</option>
              {data.sites.map((s) => <option key={s.siteUrl} value={s.siteUrl}>{siteLabel(s.siteUrl)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={save} disabled={status === "saving"} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved!" : "Save Site"}
            </button>
            {status === "error" && <span className="text-sm text-red-600">Couldn&apos;t save. Has the migration been run?</span>}
          </div>
        </div>
      )}
    </Card>
  );
}
