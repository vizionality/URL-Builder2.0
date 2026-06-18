"use client";

import { useState } from "react";

export function Header({
  title,
  subtitle,
  onExport,
  onSave,
}: {
  title: string;
  subtitle?: string;
  onExport?: () => void;
  onSave?: () => void;
}) {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave?.();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-5 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      <div className="flex gap-2">
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Export
          </button>
        )}
        {onSave && (
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            {saved ? "Saved!" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}
