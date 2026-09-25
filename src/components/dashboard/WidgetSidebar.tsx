"use client";

import { useEffect, useState } from "react";
import { Check, Plus, RotateCcw, Search, X } from "lucide-react";
import { WIDGETS, type WidgetCategory } from "@/lib/dashboard-widgets";
import { CatalogDraggable, SidebarDropZone } from "@/components/dashboard/DragParts";

const CATEGORIES: WidgetCategory[] = ["Summary", "Traffic", "Acquisition", "Geography", "Conversions"];

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "unavailable";

// Right-hand "Customize" panel: search the widget catalog, add or remove
// widgets, reset to the default layout. Changes save automatically.
export function WidgetSidebar({
  open,
  layout,
  onToggle,
  onReset,
  onClose,
  status,
}: {
  open: boolean;
  layout: string[];
  onToggle: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
  status: SaveStatus;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const q = query.trim().toLowerCase();
  const shown = layout.length;

  return (
    <>
      {/* Backdrop on small screens, where the panel covers the page. */}
      <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={onClose} aria-hidden />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-zinc-200 bg-white shadow-xl"
        aria-label="Customize dashboard"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Customize dashboard</h2>
            <p className="text-xs text-zinc-500">
              {shown} of {WIDGETS.length} widgets shown ·{" "}
              {status === "saving"
                ? "Saving…"
                : status === "saved"
                  ? "Saved"
                  : status === "error"
                    ? <span className="text-red-600">Couldn&apos;t save</span>
                    : status === "unavailable"
                      ? <span className="text-amber-700">Saving isn&apos;t set up yet</span>
                      : "Saves automatically"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-zinc-500 hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-zinc-200 px-4 py-2">
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search widgets"
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>

        <SidebarDropZone className="flex-1 overflow-y-auto px-4 py-3 transition-colors">
          <p className="mb-3 text-xs text-zinc-500">
            Drag a widget onto the dashboard to add it where you drop it, or drag one from the dashboard back here to
            remove it. Grab the ⋮⋮ handle on a widget to reorder.
          </p>
          {CATEGORIES.map((cat) => {
            const items = WIDGETS.filter(
              (w) => w.category === cat && (!q || `${w.title} ${w.description}`.toLowerCase().includes(q))
            );
            if (items.length === 0) return null;
            return (
              <section key={cat} className="mb-4">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">{cat}</h3>
                <ul className="space-y-1.5">
                  {items.map((w) => {
                    const on = layout.includes(w.id);
                    return (
                      <li key={w.id}>
                        {on ? (
                          <div
                          className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                            on ? "border-green-200 bg-green-50/60" : "border-zinc-200 bg-white"
                          }`}
                        >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-800">{w.title}</p>
                          <p className="text-xs text-zinc-500">{w.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggle(w.id)}
                          aria-label={on ? `Remove ${w.title}` : `Add ${w.title}`}
                          className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                            on
                              ? "text-green-700 hover:bg-red-50 hover:text-red-600"
                              : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {on ? <><Check className="h-3.5 w-3.5" /> Added</> : <><Plus className="h-3.5 w-3.5" /> Add</>}
                        </button>
</div>
                        ) : (
                          <CatalogDraggable id={w.id} title={w.title}>
                            <div
                          className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${
                            on ? "border-green-200 bg-green-50/60" : "border-zinc-200 bg-white"
                          }`}
                        >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-800">{w.title}</p>
                          <p className="text-xs text-zinc-500">{w.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggle(w.id)}
                          aria-label={on ? `Remove ${w.title}` : `Add ${w.title}`}
                          className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                            on
                              ? "text-green-700 hover:bg-red-50 hover:text-red-600"
                              : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {on ? <><Check className="h-3.5 w-3.5" /> Added</> : <><Plus className="h-3.5 w-3.5" /> Add</>}
                        </button>
</div>
                          </CatalogDraggable>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </SidebarDropZone>

        <div className="border-t border-zinc-200 px-4 py-3">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            <RotateCcw className="h-4 w-4" /> Reset to default
          </button>
        </div>
      </aside>
    </>
  );
}
