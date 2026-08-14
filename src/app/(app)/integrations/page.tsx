"use client";

import { useEffect, useState } from "react";
import { Loader2, Plug, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";

type Connection = {
  connected: boolean;
  email?: string | null;
  propertyId?: string;
  propertyName?: string;
};

type Property = { id: string; name: string; account: string };

const selectClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

export default function IntegrationsPage() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [banner] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const status = new URLSearchParams(window.location.search).get("ga4");
    if (status === "connected") return "Google Analytics connected.";
    if (status === "norefresh")
      return "Connection failed — Google didn't return access. Try again.";
    if (status === "error")
      return "Something went wrong connecting to Google. Try again.";
    return null;
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/ga4/connection");
      const data: Connection = await res.json();
      if (cancelled) return;
      setConnection(data);
      setSelected(data.propertyId ?? "");
      if (!data.connected) return;
      try {
        const propRes = await fetch("/api/ga4/properties");
        const propData = await propRes.json();
        if (cancelled) return;
        if (!propRes.ok)
          throw new Error(propData.error ?? "Failed to load properties.");
        setProperties(propData.properties ?? []);
      } catch (err) {
        if (!cancelled)
          setPropertiesError(
            err instanceof Error ? err.message : "Failed to load properties."
          );
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveProperty() {
    if (!selected) return;
    setSaving(true);
    try {
      const prop = properties.find((p) => p.id === selected);
      await fetch("/api/ga4/property", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId: selected, propertyName: prop?.name }),
      });
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 1500);
      setConnection((c) => (c ? { ...c, propertyId: selected } : c));
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm("Disconnect Google Analytics?")) return;
    await fetch("/api/ga4/disconnect", { method: "POST" });
    setProperties([]);
    setSelected("");
    setConnection({ connected: false });
  }

  return (
    <>
      <Header title="Integrations" subtitle="Connect external data sources" />
      <main className="flex-1 px-4 py-6 sm:px-6">
        {banner && (
          <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {banner}
          </p>
        )}
        <Card
          title="Google Analytics 4"
          description="Connect your Google Analytics account to pull real session data for your campaigns."
        >
          {connection === null ? (
            <div className="flex items-center gap-2 py-6 text-zinc-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : !connection.connected ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">
                You&rsquo;ll be sent to Google to grant read-only access to your
                Analytics data. You can revoke it anytime.
              </p>
              <a
                href="/api/ga4/oauth/start"
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                <Plug size={16} />
                Connect Google Analytics
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="flex items-center gap-1.5 text-sm text-green-700">
                <CheckCircle2 size={16} />
                Connected{connection.email ? ` as ${connection.email}` : ""}.
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">
                  GA4 Property
                </label>
                {propertiesError ? (
                  <p className="text-sm text-red-600">{propertiesError}</p>
                ) : properties.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-zinc-400">
                    <Loader2 size={14} className="animate-spin" />
                    Loading properties…
                  </p>
                ) : (
                  <select
                    className={selectClass}
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    <option value="">Select a property…</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.account ? `${p.account} — ` : ""}
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </select>
                )}
                <p className="mt-1 text-xs text-zinc-400">
                  Pick the property whose campaign data you want to see.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveProperty}
                  disabled={!selected || saving}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : savedFeedback ? "Saved!" : "Save Property"}
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </Card>
      </main>
    </>
  );
}
