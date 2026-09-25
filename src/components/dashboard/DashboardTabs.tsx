"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

export type DashboardPage = { id: string; name: string };

const KEY = "dashboardPages";
const EVENT = "dashboard-pages-change";

// Custom dashboard pages the user created from "More", kept in this browser.
function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function parse(raw: string): DashboardPage[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((p) => p && typeof p.id === "string" && typeof p.name === "string") : [];
  } catch {
    return [];
  }
}

function write(pages: DashboardPage[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(pages));
  } catch {
    // Storage blocked: the page list just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useDashboardPages(): DashboardPage[] {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  return parse(raw);
}

const BUILT_IN = [
  { href: "/dashboard/ai", name: "AI Overview" },
  { href: "/dashboard", name: "Google Analytics" },
  { href: "/dashboard/seo", name: "SEO Dashboard" },
  { href: "/dashboard/social", name: "Social Media" },
];

// Tabs for the dashboard's pages, with a "More" menu for custom pages.
export function DashboardTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const pages = useDashboardPages();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const customActive = pages.find((p) => pathname === `/dashboard/p/${p.id}`);

  function create(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = Math.random().toString(36).slice(2, 10);
    write([...pages, { id, name: trimmed.slice(0, 60) }]);
    setName("");
    setOpen(false);
    router.push(`/dashboard/p/${id}`);
  }

  function remove(id: string) {
    write(pages.filter((p) => p.id !== id));
    if (pathname === `/dashboard/p/${id}`) router.push("/dashboard");
  }

  const tab = (active: boolean) =>
    `-mb-px whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium ${
      active ? "border-green-600 text-green-700" : "border-transparent text-zinc-500 hover:text-zinc-800"
    }`;

  return (
    <div className="flex items-end gap-1 border-b border-zinc-200 bg-white px-4 pt-2 sm:px-6">
      <nav aria-label="Dashboard pages" className="flex items-end gap-1 overflow-x-auto">
        {BUILT_IN.map((t) => (
          <Link key={t.href} href={t.href} className={tab(pathname === t.href)} aria-current={pathname === t.href ? "page" : undefined}>
            {t.name}
          </Link>
        ))}
        {customActive && (
          <span className={tab(true)} aria-current="page">{customActive.name}</span>
        )}
      </nav>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={`${tab(false)} inline-flex items-center gap-1`}
        >
          More <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg" role="menu">
            {pages.length > 0 && (
              <ul className="mb-2 max-h-60 overflow-y-auto border-b border-zinc-100 pb-2">
                {pages.map((p) => (
                  <li key={p.id} className="group flex items-center gap-1">
                    <Link
                      href={`/dashboard/p/${p.id}`}
                      onClick={() => setOpen(false)}
                      role="menuitem"
                      className={`min-w-0 flex-1 truncate rounded px-2 py-1.5 text-sm hover:bg-zinc-50 ${
                        customActive?.id === p.id ? "font-medium text-green-700" : "text-zinc-700"
                      }`}
                    >
                      {p.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      aria-label={`Delete ${p.name}`}
                      className="rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={create} className="flex items-center gap-1.5">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New page name"
                aria-label="New page name"
                maxLength={60}
                className="min-w-0 flex-1 rounded-md border border-zinc-200 px-2 py-1.5 text-sm outline-none focus:border-green-500"
              />
              <button
                type="submit"
                disabled={!name.trim()}
                className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> Create
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// A blank page: grey outlines where the Google Analytics page's cards sit.
export function BlankDashboard({ name }: { name: string }) {
  const box = "rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50";
  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <p className="mb-4 text-sm text-zinc-500">{name} has no cards yet.</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => <div key={i} className={`${box} h-24`} />)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-12" aria-hidden>
        <div className={`${box} h-80 lg:col-span-12`} />
        {[0, 1, 2].map((i) => <div key={`t${i}`} className={`${box} h-80 lg:col-span-4`} />)}
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={`h${i}`} className={`${box} h-80 lg:col-span-6`} />)}
      </div>
    </main>
  );
}
