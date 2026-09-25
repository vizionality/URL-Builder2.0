"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Loader2 } from "lucide-react";

type Link = { name?: string; project?: string; dailyExportEnabled?: boolean; datasetLocation?: string; createTime?: string };

// Test control on the GA4 card: link the saved property to our BigQuery
// project in one click, showing Google's exact response.
export function BigQueryLinkTest({ propertyId }: { propertyId: string }) {
  const [links, setLinks] = useState<Link[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/ga4/bigquery-link");
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(d.error ?? "Couldn't read BigQuery links.");
      setLinks([]);
      return;
    }
    setError(null);
    setLinks(d.links ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload when the saved property changes
    setLinks(null);
    load();
  }, [load, propertyId]);

  async function link() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/ga4/bigquery-link", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setError(d.error ?? "Linking failed.");
      return;
    }
    setDone(true);
    load();
  }

  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
        <Database size={15} /> BigQuery export <span className="rounded bg-amber-100 px-1.5 text-xs text-amber-800">Test</span>
      </p>
      {links === null ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-zinc-400"><Loader2 size={14} className="animate-spin" /> Checking…</p>
      ) : (
        <>
          {links.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-zinc-600">
              {links.map((l) => (
                <li key={l.name}>
                  Linked to <span className="font-medium">{l.project}</span> ({l.datasetLocation ?? "?"}, daily {l.dailyExportEnabled ? "on" : "off"})
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">Property {propertyId} isn&apos;t linked to BigQuery.</p>
          )}
          {links.length === 0 && (
            <button
              type="button"
              onClick={link}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} Link to BigQuery
            </button>
          )}
          {done && <p className="mt-2 text-sm text-green-700">Linked. The first daily export arrives within about 24 hours.</p>}
        </>
      )}
      {error && (
        <p className="mt-2 break-words rounded bg-red-50 px-2 py-1.5 font-mono text-xs text-red-700">Google said: {error}</p>
      )}
    </div>
  );
}
