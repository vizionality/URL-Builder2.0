"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Copy, Check, Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { buildGtmTag } from "@/lib/attribution/snippet";

type Site = {
  id: string;
  name: string;
  site_key: string;
  collector_host: string | null;
  allowed_origins: string[];
  created_at: string;
};

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function InstallCard({ site }: { site: Site }) {
  const host = site.collector_host;
  const tag = host ? buildGtmTag({ collectorHost: host, siteKey: site.site_key }) : "";

  return (
    <Card title={site.name} description={`Site key: ${site.site_key}`}>
      {!host ? (
        <p className="rounded-md border border-dashed border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          Set a collector host for this site (below) to generate the GTM tag. It
          must be a subdomain on the client site, e.g. metrics.clientsite.com.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                1. Point the collector host at this app
              </p>
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600">
              <li>
                Add a CNAME record: <code className="rounded bg-zinc-100 px-1">{host}</code> to{" "}
                <code className="rounded bg-zinc-100 px-1">cname.vercel-dns.com</code>.
              </li>
              <li>
                Add <code className="rounded bg-zinc-100 px-1">{host}</code> as a custom domain on
                this app&apos;s Vercel project so the collector answers there.
              </li>
            </ol>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                2. Paste this GTM Custom HTML tag (fire on All Pages)
              </p>
              <CopyButton text={tag} label="Copy tag" />
            </div>
            <pre className="max-h-64 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700">
              {tag}
            </pre>
          </div>
        </div>
      )}
    </Card>
  );
}

function SettingsRow({ site, onSaved }: { site: Site; onSaved: () => void }) {
  const [host, setHost] = useState(site.collector_host ?? "");
  const [origins, setOrigins] = useState(site.allowed_origins.join(", "));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/attribution/sites", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: site.id,
          collector_host: host,
          allowed_origins: origins.split(",").map((o) => o.trim()).filter(Boolean),
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-zinc-600">Collector host</span>
        <input
          className={inputClass}
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="metrics.clientsite.com"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-zinc-600">
          Allowed origins (comma-separated, optional)
        </span>
        <input
          className={inputClass}
          value={origins}
          onChange={(e) => setOrigins(e.target.value)}
          placeholder="https://www.clientsite.com"
        />
      </label>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

export default function AttributionPage() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    fetch("/api/attribution/sites")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load sites.");
        return d.sites as Site[];
      })
      .then((s) => setSites(s))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load sites."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createSite() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await fetch("/api/attribution/sites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Header
        title="Attribution"
        subtitle="Capture multi-touch journeys from your clients' sites via GTM"
      />
      <div className="space-y-6 p-4 sm:p-6">
        <Card title="Add a site" description="Create a site to get a capture key and GTM tag.">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-zinc-600">Site name</span>
              <input
                className={inputClass}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Client name or domain"
              />
            </label>
            <button
              type="button"
              onClick={createSite}
              disabled={creating || !newName.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Plus size={15} />
              {creating ? "Creating…" : "Create site"}
            </button>
          </div>
        </Card>

        {error ? (
          <Card>
            <p className="py-4 text-sm text-red-600">{error}</p>
          </Card>
        ) : sites === null ? (
          <Card>
            <div className="flex items-center gap-2 py-6 text-zinc-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading sites…</span>
            </div>
          </Card>
        ) : sites.length === 0 ? (
          <Card>
            <p className="py-4 text-sm text-zinc-500">
              No sites yet. Create one above to get a GTM tag.
            </p>
          </Card>
        ) : (
          sites.map((site) => (
            <div key={site.id} className="space-y-3">
              <InstallCard site={site} />
              <Card title="Site settings">
                <SettingsRow site={site} onSaved={load} />
              </Card>
            </div>
          ))
        )}
      </div>
    </>
  );
}
