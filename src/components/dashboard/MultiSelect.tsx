"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Minus, Search } from "lucide-react";
import { compact } from "@/lib/report";

export type FilterOption = { name: string; sessions: number };

// Looker Studio-style search-and-select filter. An empty selection means
// "all" (no filter). Changes apply when the panel closes, so ticking several
// boxes costs one report instead of one per click.
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Draft of checked names while the panel is open.
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const all = useMemo(() => options.map((o) => o.name), [options]);

  function openPanel() {
    setDraft(new Set(selected.length ? selected : all));
    setQuery("");
    setOpen(true);
  }

  function closePanel() {
    setOpen(false);
    const next = all.filter((n) => draft.has(n));
    // Everything (or nothing) checked means no filter.
    const normalized = next.length === all.length || next.length === 0 ? [] : next;
    if (normalized.join("\u0000") !== selected.join("\u0000")) onChange(normalized);
  }

  // Close on outside click or Escape.
  const closeRef = useRef(closePanel);
  useEffect(() => {
    closeRef.current = closePanel;
  });
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
  const visibleChecked = visible.filter((o) => draft.has(o.name)).length;
  const headState = visibleChecked === 0 ? "none" : visibleChecked === visible.length ? "all" : "some";

  // Header box toggles every visible (search-matched) value.
  function toggleVisible() {
    const next = new Set(draft);
    if (headState === "all") visible.forEach((o) => next.delete(o.name));
    else visible.forEach((o) => next.add(o.name));
    setDraft(next);
  }

  function toggle(name: string) {
    const next = new Set(draft);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setDraft(next);
  }

  const summary =
    selected.length === 0 ? "All" : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? closePanel() : openPanel())}
        aria-expanded={open}
        className={`flex max-w-64 items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 ${
          selected.length ? "border-green-500" : "border-zinc-200"
        }`}
      >
        <span className="text-zinc-500">{label}:</span>
        <span className="truncate font-medium">{summary}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-1 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-800">
            <Box state={headState} onClick={toggleVisible} label={`Select all ${label.toLowerCase()} values`} />
            <span className="flex-1">{label}</span>
            <span>Sessions</span>
          </div>
          <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search"
              className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {visible.map((o) => (
              <li key={o.name} className="group flex items-center gap-3 px-3 py-1.5 text-sm hover:bg-zinc-50">
                <Box state={draft.has(o.name) ? "all" : "none"} onClick={() => toggle(o.name)} label={o.name} />
                <button
                  type="button"
                  onClick={() => toggle(o.name)}
                  className="flex-1 truncate text-left text-zinc-700"
                  title={o.name}
                >
                  {o.name}
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(new Set([o.name]))}
                  className="hidden text-xs font-medium text-green-700 hover:underline group-hover:inline"
                >
                  Only
                </button>
                <span className="w-12 text-right tabular-nums text-zinc-500">{compact(o.sessions)}</span>
              </li>
            ))}
            {visible.length === 0 && <li className="px-3 py-3 text-sm text-zinc-400">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function Box({ state, onClick, label }: { state: "all" | "some" | "none"; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "all" ? true : state === "some" ? "mixed" : false}
      aria-label={label}
      onClick={onClick}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
        state === "none" ? "border-zinc-300 bg-white" : "border-green-600 bg-green-600 text-white"
      }`}
    >
      {state === "all" && <Check className="h-3.5 w-3.5" />}
      {state === "some" && <Minus className="h-3.5 w-3.5" />}
    </button>
  );
}
