"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { buildUtmUrl } from "@/lib/utm";
import { downloadCsv } from "@/lib/csv";
import { useBulkRows, useUtmOptions } from "@/lib/storage";
import type { BulkRow } from "@/lib/types";

const inputClass =
  "w-full min-w-32 rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

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

export default function BulkBuilderPage() {
  const [rows, setRows] = useBulkRows();
  const [options] = useUtmOptions();
  const [copiedAll, setCopiedAll] = useState(false);

  function updateRow(id: string, patch: Partial<BulkRow>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        return { ...next, generatedUrl: generatedUrlFor(next) };
      })
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function deleteRow(id: string) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function clearAll() {
    if (rows.length === 0) return;
    if (!window.confirm("Delete all rows from the bulk builder?")) return;
    setRows([]);
  }

  async function copyAll() {
    const urls = rows.map((row) => row.generatedUrl).filter(Boolean);
    if (urls.length === 0) return;
    await navigator.clipboard.writeText(urls.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }

  function handleExport() {
    downloadCsv(
      "bulk-utm-urls.csv",
      rows.map((row) => ({
        baseUrl: row.baseUrl,
        source: row.source,
        medium: row.medium,
        campaign: row.campaign,
        generatedUrl: row.generatedUrl,
      }))
    );
  }

  return (
    <>
      <Header
        title="Bulk Builder"
        subtitle="Create multiple UTM URLs at once"
        onExport={handleExport}
        onSave={() => {}}
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <Card title="Bulk UTM Builder">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addRow}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Add Row
            </button>
            <button
              type="button"
              onClick={copyAll}
              disabled={rows.length === 0}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
            >
              {copiedAll ? "Copied!" : "Copy All URLs"}
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={rows.length === 0}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              Clear All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500">
                  <th className="px-2 py-2">Website URL</th>
                  <th className="px-2 py-2">UTM Source</th>
                  <th className="px-2 py-2">UTM Medium</th>
                  <th className="px-2 py-2">UTM Campaign</th>
                  <th className="px-2 py-2">Generated URL</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="px-2 py-2">
                      <input
                        className={inputClass}
                        type="text"
                        placeholder="https://example.com"
                        value={row.baseUrl}
                        onChange={(e) =>
                          updateRow(row.id, { baseUrl: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className={inputClass}
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
                    <td className="px-2 py-2">
                      <select
                        className={inputClass}
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
                    <td className="px-2 py-2">
                      <select
                        className={inputClass}
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
                    <td className="px-2 py-2">
                      <input
                        className={`${inputClass} bg-zinc-50 font-mono text-xs`}
                        type="text"
                        readOnly
                        value={row.generatedUrl}
                        placeholder="—"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteRow(row.id)}
                        aria-label="Delete row"
                        className="rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
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
