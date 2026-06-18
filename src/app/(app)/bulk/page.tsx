"use client";

import { useState } from "react";
import { Trash2, Plus, Copy, Check, Save } from "lucide-react";
import { Card } from "@/components/Card";
import { buildUtmUrl } from "@/lib/utm";
import { useBulkRows, useUtmOptions } from "@/lib/storage";
import type { BulkRow } from "@/lib/types";

const cellInputClass =
  "w-full min-w-32 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

function generatedUrlFor(row: BulkRow): string {
  const result = buildUtmUrl({
    baseUrl: row.baseUrl,
    source: row.source,
    medium: row.medium,
    campaign: row.campaign,
  });
  return result.ok ? result.url : "";
}

function emptyRow(): BulkRow {
  return {
    id: crypto.randomUUID(),
    baseUrl: "",
    source: "",
    medium: "",
    campaign: "",
    generatedUrl: "",
  };
}

function nowLabel(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function BulkBuilderPage() {
  const [rows, setRows] = useBulkRows();
  const [options] = useUtmOptions();
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function markSaved() {
    setSavedAt(nowLabel());
  }

  function updateRow(id: string, patch: Partial<BulkRow>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        return { ...next, generatedUrl: generatedUrlFor(next) };
      })
    );
    markSaved();
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
    markSaved();
  }

  function deleteRow(id: string) {
    setRows((prev) => prev.filter((row) => row.id !== id));
    markSaved();
  }

  function clearAll() {
    if (rows.length === 0) return;
    if (!window.confirm("Delete all rows from the bulk builder?")) return;
    setRows([]);
    markSaved();
  }

  async function copyAll() {
    const urls = rows.map((row) => row.generatedUrl).filter(Boolean);
    if (urls.length === 0) return;
    await navigator.clipboard.writeText(urls.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }

  async function copyRow(row: BulkRow) {
    if (!row.generatedUrl) return;
    await navigator.clipboard.writeText(row.generatedUrl);
    setCopiedId(row.id);
    setTimeout(() => setCopiedId((id) => (id === row.id ? null : id)), 1500);
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-5 sm:px-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Bulk UTM Builder
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Build multiple UTM URLs at once using spreadsheet-style input
          </p>
          {savedAt && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-600">
              <Save size={14} />
              Auto-saved at {savedAt}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Plus size={16} />
            Add Row
          </button>
          <button
            type="button"
            onClick={clearAll}
            disabled={rows.length === 0}
            className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={copyAll}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-violet-700 hover:to-purple-700 disabled:opacity-40"
          >
            <Copy size={16} />
            {copiedAll ? "Copied!" : "Copy All URLs"}
          </button>
        </div>
      </div>

      <main className="flex-1 px-4 py-6 sm:px-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
                  <th className="px-2 py-2">Website URL</th>
                  <th className="px-2 py-2">UTM Source</th>
                  <th className="px-2 py-2">UTM Medium</th>
                  <th className="px-2 py-2">UTM Campaign</th>
                  <th className="px-2 py-2">Generated URL</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 align-top"
                  >
                    <td className="px-2 py-3">
                      <input
                        className={cellInputClass}
                        type="text"
                        placeholder="https://example.com"
                        value={row.baseUrl}
                        onChange={(e) =>
                          updateRow(row.id, { baseUrl: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-3">
                      <select
                        className={cellInputClass}
                        value={row.source}
                        onChange={(e) =>
                          updateRow(row.id, { source: e.target.value })
                        }
                      >
                        <option value="">Select…</option>
                        {options.sources.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <select
                        className={cellInputClass}
                        value={row.medium}
                        onChange={(e) =>
                          updateRow(row.id, { medium: e.target.value })
                        }
                      >
                        <option value="">Select…</option>
                        {options.mediums.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <select
                        className={cellInputClass}
                        value={row.campaign}
                        onChange={(e) =>
                          updateRow(row.id, { campaign: e.target.value })
                        }
                      >
                        <option value="">Select…</option>
                        {options.campaigns.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-start gap-2">
                        <code className="min-w-0 flex-1 break-all rounded-md bg-zinc-100 px-2.5 py-1.5 font-mono text-xs text-zinc-600">
                          {row.generatedUrl || "—"}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyRow(row)}
                          disabled={!row.generatedUrl}
                          aria-label="Copy URL"
                          className="shrink-0 rounded-md border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-40"
                        >
                          {copiedId === row.id ? (
                            <Check size={16} className="text-green-600" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        aria-label="Delete row"
                        className="rounded-md border border-zinc-200 p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-400">
                No rows yet. Click &ldquo;Add Row&rdquo; to get started.
              </p>
            )}
          </div>
        </Card>
      </main>
    </>
  );
}
