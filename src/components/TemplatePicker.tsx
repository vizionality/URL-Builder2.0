"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { UtmTemplate } from "@/lib/utmTemplates";

export function TemplatePicker({
  templates,
  platformOrder,
  value,
  onSelect,
}: {
  templates: UtmTemplate[];
  platformOrder: string[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = templates.find((t) => t.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return platformOrder
      .map((platform) => ({
        platform,
        items: templates.filter(
          (t) =>
            t.platform === platform &&
            (q === "" ||
              t.name.toLowerCase().includes(q) ||
              t.platform.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [templates, platformOrder, query]);

  function choose(id: string) {
    onSelect(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      >
        <span className={selected ? "truncate" : "truncate text-zinc-400"}>
          {selected ? (
            <>
              <span className="text-zinc-400">{selected.platform} · </span>
              {selected.name}
            </>
          ) : (
            "Select a template…"
          )}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 p-2">
            <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
              <Search size={14} className="shrink-0 text-zinc-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search templates…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1">
            {groups.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-400">
                No templates match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.platform} className="mb-1 last:mb-0">
                  <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                    {group.platform}
                  </p>
                  <ul>
                    {group.items.map((t) => {
                      const isActive = t.id === value;
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => choose(t.id)}
                            className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm ${
                              isActive
                                ? "bg-green-50 font-medium text-green-700"
                                : "text-zinc-700 hover:bg-green-50 hover:text-green-700"
                            }`}
                          >
                            <span className="truncate">{t.name}</span>
                            {isActive && (
                              <Check size={14} className="shrink-0 text-green-600" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
