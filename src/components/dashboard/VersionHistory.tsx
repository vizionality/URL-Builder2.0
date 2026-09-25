"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { versionDiff, widgetCount } from "@/lib/dashboard-widgets";

type Version = { id: string; widgets: string[]; createdAt: string; updatedAt: string };

function when(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${time}`;
}

// Saved layout versions, newest first, each restorable. `current` is the
// layout on screen (saved-entry form); `refreshKey` reloads the list after a save.
export function VersionHistory({
  current,
  refreshKey,
  onRestore,
  layoutQuery = "",
}: {
  current: string[];
  refreshKey: string;
  // "?page=ai" for the AI Overview tab's own layout.
  layoutQuery?: string;
  onRestore: (widgets: string[]) => void;
}) {
  const [state, setState] = useState<{ loading: boolean; unavailable: boolean; versions: Version[] }>({
    loading: true,
    unavailable: false,
    versions: [],
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dashboard/layout/versions${layoutQuery}`)
      .then((r) => r.json())
      .then((d: { versions?: Version[]; unavailable?: boolean }) => {
        if (!cancelled) setState({ loading: false, unavailable: Boolean(d.unavailable), versions: d.versions ?? [] });
      })
      .catch(() => !cancelled && setState({ loading: false, unavailable: true, versions: [] }));
    return () => {
      cancelled = true;
    };
  }, [refreshKey, layoutQuery]);

  if (state.loading && state.versions.length === 0) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
      </div>
    );
  }
  if (state.unavailable) {
    return (
      <p className="py-6 text-sm text-amber-700">
        Version history isn&apos;t set up yet. Run the migration <code>20260926_dashboard_layout_versions.sql</code>.
      </p>
    );
  }
  if (state.versions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-zinc-500">
        <History className="mx-auto mb-2 h-5 w-5 text-zinc-300" />
        No saved versions yet. Each change you make is saved here.
      </div>
    );
  }

  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  return (
    <div>
      <p className="mb-3 text-xs text-zinc-500">
        Your last {state.versions.length} saved layouts. Changes made within 10 minutes of each other are grouped
        into one version. Restoring can be undone.
      </p>
      <ul className="space-y-1.5">
        {state.versions.map((v, i) => {
          const isCurrent = same(v.widgets, current);
          const diff = versionDiff(current, v.widgets);
          const summary = [
            diff.added.length ? `+ ${diff.added.join(", ")}` : "",
            diff.removed.length ? `- ${diff.removed.join(", ")}` : "",
          ].filter(Boolean);
          return (
            <li
              key={v.id}
              className={`rounded-lg border px-3 py-2 ${isCurrent ? "border-green-200 bg-green-50/60" : "border-zinc-200"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800">
                    {when(v.updatedAt)}
                    {i === 0 && <span className="ml-1.5 text-xs font-normal text-zinc-400">latest</span>}
                  </p>
                  <p className="text-xs text-zinc-500">{widgetCount(v.widgets)} widgets</p>
                  {!isCurrent && summary.length === 0 && (
                    <p className="text-xs text-zinc-400">Same widgets, different order or sizes</p>
                  )}
                  {summary.map((line) => (
                    <p key={line} className="truncate text-xs text-zinc-500" title={line}>{line}</p>
                  ))}
                </div>
                {isCurrent ? (
                  <span className="shrink-0 text-xs font-medium text-green-700">Current</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRestore(v.widgets)}
                    className="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Restore
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
