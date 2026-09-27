"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Lock, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { api } from "@/lib/client-scope";

type Share = { id: string; token: string; hasPassword: boolean; createdAt: string };

// Manage this client's read-only portal links.
export default function ClientPortalSettings() {
  const [shares, setShares] = useState<Share[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(api("/api/clients/shares"))
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setShares(d.shares);
      })
      .catch((e) => setError(e instanceof Error && e.message ? e.message : "Couldn't load links."));
  }, []);
  useEffect(load, [load]);

  const linkFor = (token: string) => `${window.location.origin}/portal/${token}`;

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch(api("/api/clients/shares"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: usePassword ? password : "" }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    setBusy(false);
    if (!r?.ok) {
      setError(d?.error ?? "Couldn't create the link.");
      return;
    }
    setPassword("");
    setUsePassword(false);
    load();
  }

  async function revoke(id: string) {
    if (!window.confirm("Turn off this link? Anyone using it will lose access.")) return;
    await fetch(api(`/api/clients/shares?id=${encodeURIComponent(id)}`), { method: "DELETE" }).catch(() => null);
    load();
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(linkFor(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      window.prompt("Copy this link:", linkFor(token));
    }
  }

  return (
    <>
      <Header title="Client portal" subtitle="Share a view-only dashboard with this client" />
      <main className="flex-1 space-y-6 px-4 py-6 sm:px-6">
        <Card
          title="Create a portal link"
          description="Anyone with the link sees this client's Google Analytics and SEO dashboards, view only. They can change dates and filters but can't edit anything or see other clients."
        >
          <form onSubmit={create} className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} />
              Protect with a password
            </label>
            {usePassword && (
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full max-w-sm rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            )}
            <button
              type="submit"
              disabled={busy || (usePassword && password.length < 6)}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
            >
              {busy && <Loader2 size={14} className="animate-spin" />} Create link
            </button>
          </form>
        </Card>

        <Card title="Active links">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          {!shares ? (
            !error && <p className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 size={14} className="animate-spin" /> Loading…</p>
          ) : shares.length === 0 ? (
            <p className="text-sm text-zinc-500">No active links.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {shares.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <code className="min-w-0 flex-1 truncate text-sm text-zinc-700">/portal/{s.token}</code>
                  {s.hasPassword && (
                    <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                      <Lock className="h-3 w-3" /> Password
                    </span>
                  )}
                  <span className="text-xs text-zinc-400">{new Date(s.createdAt).toLocaleDateString()}</span>
                  <button type="button" onClick={() => copy(s.token)} className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                    {copied === s.token ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                  </button>
                  <a href={`/portal/${s.token}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </a>
                  <button type="button" onClick={() => revoke(s.id)} aria-label="Turn off link" className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
