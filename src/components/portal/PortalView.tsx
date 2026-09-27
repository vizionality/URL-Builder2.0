"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { setPortalToken } from "@/lib/client-scope";
import { GaDashboard } from "@/components/dashboard/GaDashboard";
import { SeoDashboard } from "@/components/dashboard/SeoDashboard";

// The portal's tabs: the Google Analytics report and, if connected, SEO.
export function PortalView({ token, clientName, hasSearchConsole }: { token: string; clientName: string; hasSearchConsole: boolean }) {
  // Every data call from this page goes through the link (browser only).
  if (typeof window !== "undefined") setPortalToken(token);
  const [tab, setTab] = useState<"ga" | "seo">("ga");
  const tabs = [
    { id: "ga" as const, label: "Google Analytics" },
    ...(hasSearchConsole ? [{ id: "seo" as const, label: "SEO" }] : []),
  ];
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 pt-5 sm:px-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Performance dashboard</p>
        <h1 className="text-xl font-semibold text-zinc-900">{clientName}</h1>
        <nav className="mt-3 flex gap-1" aria-label="Dashboard">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium ${
                tab === t.id ? "border-green-600 text-green-700" : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      {tab === "ga" ? <GaDashboard readOnly /> : <SeoDashboard />}
      <footer className="px-4 py-6 text-center text-xs text-zinc-400">View-only report. Data from Google Analytics{hasSearchConsole ? " and Search Console" : ""}.</footer>
    </div>
  );
}

export function PortalPassword({ token, clientName }: { token: string; clientName: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/portal/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) setError(d?.error ?? "Couldn't unlock.");
    else router.refresh();
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Lock className="h-6 w-6 text-green-600" />
        <h1 className="mt-3 text-lg font-semibold text-zinc-900">{clientName}</h1>
        <p className="mt-1 text-sm text-zinc-500">Enter the password to view this dashboard.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          placeholder="Password"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy || !password} className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60">
          {busy ? "Checking…" : "View dashboard"}
        </button>
      </form>
    </main>
  );
}
