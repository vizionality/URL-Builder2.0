"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronRight as Caret } from "lucide-react";
import { PRESET_GROUPS, presetLabel, presetRange, type DatePreset } from "@/lib/report";

export type DateValue = {
  preset: DatePreset;
  includeToday: boolean;
  // The range used when preset is "custom" (Fixed).
  custom: { startDate: string; endDate: string };
};

// Resolve the picker value to the range it shows.
export function resolveRange(v: DateValue, today: string): { startDate: string; endDate: string } {
  return presetRange(v.preset, today, v.includeToday) ?? v.custom;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// Looker Studio-style date control: a preset menu (with "This ..." and
// "Last ..." submenus), Include today, and Start/End calendars. Changes are
// drafted in the panel and only applied with Apply.
export function DateRangePicker({
  value,
  today,
  onChange,
}: {
  value: DateValue;
  today: string;
  onChange: (v: DateValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenu, setSubmenu] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const shown = resolveRange(value, today);
  const range = resolveRange(draft, today);

  function openPanel() {
    setDraft(value);
    setMenuOpen(false);
    setOpen(true);
  }

  // Close (discarding the draft) on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choosePreset(id: DatePreset) {
    // Switching to Fixed starts from the range currently shown.
    setDraft((d) => ({ ...d, preset: id, custom: id === "custom" ? resolveRange(d, today) : d.custom }));
    setMenuOpen(false);
    setSubmenu(null);
  }

  // Picking a day makes the range Fixed, keeping start <= end.
  function pickStart(iso: string) {
    setDraft((d) => ({ ...d, preset: "custom", custom: { startDate: iso, endDate: iso > range.endDate ? iso : range.endDate } }));
  }
  function pickEnd(iso: string) {
    setDraft((d) => ({ ...d, preset: "custom", custom: { startDate: iso < range.startDate ? iso : range.startDate, endDate: iso } }));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
      >
        <CalendarDays className="h-4 w-4 text-zinc-400" />
        <span className="font-medium">{formatDay(shown.startDate)} - {formatDay(shown.endDate)}</span>
        <ChevronDown className="h-4 w-4 text-zinc-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-[min(40rem,calc(100vw-2rem))] rounded-lg border border-zinc-200 bg-white shadow-lg">
          {/* Header: Include today + preset menu */}
          <div className="flex flex-wrap items-center justify-end gap-3 rounded-t-lg border-b border-zinc-200 bg-zinc-50 px-3 py-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={draft.includeToday}
                onChange={(e) => setDraft((d) => ({ ...d, includeToday: e.target.checked }))}
                className="h-4 w-4 accent-green-600"
              />
              Include today
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex min-w-52 items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800"
              >
                {presetLabel(draft.preset)}
                <ChevronDown className="h-4 w-4 text-zinc-500" />
              </button>
              {menuOpen && (
                <ul className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
                  {PRESET_GROUPS[0].items.map((p) => (
                    <MenuItem key={p.id} label={p.label} active={draft.preset === p.id} onClick={() => choosePreset(p.id)} />
                  ))}
                  {PRESET_GROUPS.slice(1).map((g) => {
                    const expanded = submenu === g.label;
                    const holds = g.items.some((p) => p.id === draft.preset);
                    return (
                      <li
                        key={g.label}
                        className="relative"
                        onMouseEnter={() => setSubmenu(g.label)}
                      >
                        <button
                          type="button"
                          onClick={() => setSubmenu(expanded ? null : g.label)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-100 ${
                            expanded ? "bg-zinc-100" : ""
                          } ${holds ? "font-semibold text-green-700" : "text-zinc-700"}`}
                        >
                          {g.label}
                          <Caret className="h-4 w-4 text-zinc-500" />
                        </button>
                        {/* Flyout to the left on wider screens, inline on phones. */}
                        {expanded && (
                          <ul className="w-full border-y border-zinc-100 bg-white py-1 sm:absolute sm:right-full sm:top-0 sm:mr-1 sm:w-72 sm:rounded-md sm:border sm:border-zinc-200 sm:shadow-lg">
                            {g.items.map((p) => (
                              <MenuItem key={p.id} label={p.label} active={draft.preset === p.id} onClick={() => choosePreset(p.id)} />
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Start / End calendars */}
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Calendar title="Start Date" selected={range.startDate} range={range} onPick={pickStart} anchor={range.startDate} />
            <Calendar title="End Date" selected={range.endDate} range={range} onPick={pickEnd} anchor={range.endDate} />
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-200 px-4 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 ${active ? "font-semibold text-green-700" : "text-zinc-700"}`}
      >
        {label}
      </button>
    </li>
  );
}

// One month grid. It opens on the month of `anchor` and follows it when the
// preset changes; the arrows browse months without changing the selection.
function Calendar({
  title,
  selected,
  range,
  anchor,
  onPick,
}: {
  title: string;
  selected: string;
  range: { startDate: string; endDate: string };
  anchor: string;
  onPick: (iso: string) => void;
}) {
  const [ay, am] = anchor.split("-").map(Number);
  const [view, setView] = useState({ y: ay, m: am, anchor });
  // Re-center when the selection moves to another month (derived state).
  if (view.anchor !== anchor) setView({ y: ay, m: am, anchor });

  const shift = (n: number) => {
    const idx = view.y * 12 + (view.m - 1) + n;
    setView({ y: Math.floor(idx / 12), m: (idx % 12) + 1, anchor });
  };

  const first = new Date(Date.UTC(view.y, view.m - 1, 1));
  const lead = first.getUTCDay();
  const days = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) =>
      `${view.y}-${String(view.m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    ),
  ];

  return (
    <div>
      <p className="mb-2 text-center text-sm font-semibold text-zinc-800">{title}</p>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium uppercase text-zinc-700">
          {MONTHS[view.m - 1]} {view.y}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="rounded p-1 hover:bg-zinc-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className="rounded p-1 hover:bg-zinc-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-zinc-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="py-1">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 border-t border-zinc-100 pt-1 text-center text-sm">
        {cells.map((iso, i) => {
          if (!iso) return <span key={`e${i}`} />;
          const isSel = iso === selected;
          const inRange = iso >= range.startDate && iso <= range.endDate;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onPick(iso)}
              className={`my-0.5 h-8 ${
                isSel
                  ? "rounded-full bg-green-600 font-semibold text-white"
                  : inRange
                    ? "bg-green-50 text-green-900"
                    : "text-zinc-700 hover:rounded-full hover:bg-zinc-100"
              }`}
            >
              {Number(iso.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
