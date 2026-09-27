"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { splitClientPath } from "@/lib/client-slug";
import { useMe } from "@/lib/use-me";

type ClientItem = { slug: string; name: string; domain: string | null; propertyId: string | null };

function readLastClient(): string {
  if (typeof document === "undefined") return "";
  return document.cookie.match(/(?:^|; )lastClient=([^;]+)/)?.[1] ?? "";
}

function Initials({ name }: { name: string }) {
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-green-100 text-xs font-semibold text-green-700">
      {letters}
    </span>
  );
}

// Sidebar client picker (agency mode): shows the current client, switches to
// another one on the same page, and opens the Add client wizard (plan allowing).
export function ClientSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { slug: urlSlug, rest } = splitClientPath(pathname);
  const [clients, setClients] = useState<ClientItem[] | null>(null);
  const [canAdd, setCanAdd] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const me = useMe();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clients")
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) setError(d.error ?? "Couldn't load clients.");
        else {
          setClients(d.clients);
          setCanAdd(d.canAddClient !== false);
        }
      })
      .catch(() => !cancelled && setError("Couldn't load clients."));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const currentSlug = urlSlug ?? readLastClient();
  const current = clients?.find((c) => c.slug === currentSlug) ?? clients?.[0] ?? null;
  const q = query.trim().toLowerCase();
  const shown = (clients ?? []).filter((c) => !q || `${c.name} ${c.domain ?? ""}`.toLowerCase().includes(q));

  function go(slug: string) {
    setOpen(false);
    setQuery("");
    // Same page for the other client; from a non-client page, its dashboard.
    router.push(`/c/${slug}${urlSlug ? rest : "/dashboard"}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-left hover:bg-zinc-50"
      >
        {current ? <Initials name={current.name} /> : <span className="h-7 w-7 rounded-md bg-zinc-100" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[10px] uppercase tracking-wide text-zinc-400">
            {me?.ownerEmail ? `Client · ${me.ownerEmail}'s team` : "Client"}
          </span>
          <span className="block truncate text-sm font-medium text-zinc-800">
            {current?.name ?? (error ? "Clients unavailable" : "Loading…")}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
          <div className="mb-1 flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients"
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto">
            {shown.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  role="option"
                  aria-selected={c.slug === current?.slug}
                  onClick={() => go(c.slug)}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left hover:bg-zinc-50"
                >
                  <Initials name={c.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-800">{c.name}</span>
                    <span className="block truncate text-xs text-zinc-400">
                      {c.propertyId ? `GA4 ${c.propertyId}` : "GA4 not set up"}
                    </span>
                  </span>
                  {c.slug === current?.slug && <Check className="h-4 w-4 text-green-600" />}
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="px-2 py-2 text-sm text-zinc-400">No matching clients.</li>}
          </ul>
          <div className="mt-1 border-t border-zinc-100 pt-1">
            {canAdd ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/clients/new");
                }}
                className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
              >
                <Plus className="h-4 w-4" /> Add client
              </button>
            ) : (
              <p className="px-1.5 py-1.5 text-xs text-zinc-500">
                Your Business plan includes one client. Upgrade to Agency to add more.
              </p>
            )}
            {error && <p className="px-1.5 pt-1 text-xs text-red-600">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
