"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Plus, RotateCcw, Search, X } from "lucide-react";
import { WIDGETS, type WidgetCategory } from "@/lib/dashboard-widgets";
import { CatalogDraggable, SidebarDropZone } from "@/components/dashboard/DragParts";
import { VersionHistory } from "@/components/dashboard/VersionHistory";
import { CHART_TYPES, type ChartType } from "@/lib/chart-widgets";
import {
  ChartArea,
  ChartBarBig,
  ChartColumn,
  ChartLine,
  ChartPie,
  Circle,
  Globe,
  Hash,
  Layers,
  Table,
} from "lucide-react";

const CHART_ICONS: Record<ChartType, React.ComponentType<{ className?: string }>> = {
  number: Hash,
  line: ChartLine,
  area: ChartArea,
  bar: ChartColumn,
  donut: Circle,
  pie: ChartPie,
  map: Globe,
  stacked: Layers,
  hbar: ChartBarBig,
  table: Table,
};

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
  savedLayout,
  onRestore,
  layoutQuery = "",
}: {
  layoutQuery?: string;
  open: boolean;
  layout: string[];
  // The on-screen layout as saved entries (with widths), for version history.
  savedLayout: string[];
  onRestore: (widgets: string[]) => void;
  onToggle: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
  status: SaveStatus;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"widgets" | "history">("widgets");
  const [chart, setChart] = useState<ChartType | null>(null);
  // Category accordions start collapsed; a search opens every matching one.
  const [expanded, setExpanded] = useState<Set<WidgetCategory>>(new Set());
  const toggleCategory = (cat: WidgetCategory) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

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
              {shown} widgets shown ·{" "}
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

        <div className="flex gap-1 border-b border-zinc-200 px-4 pt-2" role="tablist">
          {(["widgets", "history"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 pb-2 text-sm font-medium ${
                tab === t ? "border-green-600 text-green-700" : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {t === "widgets" ? "Widgets" : "History"}
            </button>
          ))}
        </div>

        {tab === "history" ? (
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <VersionHistory current={savedLayout} refreshKey={status} onRestore={onRestore} layoutQuery={layoutQuery} />
          </div>
        ) : (
        <>
        {/* Chart type: picking one lists the cards that come in that chart. */}
        <div className="border-b border-zinc-200 px-4 py-2.5">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Chart type">
            {CHART_TYPES.map((c) => {
              const Icon = CHART_ICONS[c.id];
              const on = chart === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => setChart(on ? null : c.id)}
                  className={`rounded-md border p-2 ${
                    on ? "border-green-600 bg-green-50 text-green-700" : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            {chart
              ? <>Showing <span className="font-medium text-zinc-700">{CHART_TYPES.find((c) => c.id === chart)?.label}</span> cards. <button type="button" onClick={() => setChart(null)} className="text-green-700 hover:underline">Show all</button></>
              : "Pick a chart type to see every card in that style."}
          </p>
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
            // With a chart type picked: every card in that chart. Otherwise the
            // hand-built widgets (the generated ones would swamp the list).
            const inView = (w: (typeof WIDGETS)[number]) => (chart ? w.chart === chart : !w.generated);
            const items = WIDGETS.filter(inView).filter(
              (w) => w.category === cat && (!q || `${w.title} ${w.description}`.toLowerCase().includes(q))
            );
            if (items.length === 0) return null;
            const isOpen = Boolean(q) || Boolean(chart) || expanded.has(cat);
            const added = WIDGETS.filter((w) => inView(w) && w.category === cat && layout.includes(w.id)).length;
            const total = WIDGETS.filter((w) => inView(w) && w.category === cat).length;
            return (
              <section key={cat} className="mb-1.5 rounded-lg border border-zinc-200">
                <h3>
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-zinc-50"
                  >
                    <span className="text-sm font-semibold text-zinc-800">{cat}</span>
                    <span className="flex items-center gap-2 text-xs text-zinc-500">
                      {added} of {total} added
                      <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                </h3>
                {isOpen && (
                <ul className="space-y-1.5 px-2 pb-2">
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
                )}
              </section>
            );
          })}
        </SidebarDropZone>
        </>
        )}

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
