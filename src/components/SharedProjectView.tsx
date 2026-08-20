"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, FolderPlus } from "lucide-react";
import { Card } from "@/components/Card";
import { useBulkProjects } from "@/lib/storage";
import type { BulkRow } from "@/lib/types";

// Keep in sync with the Bulk Builder's project cap.
const MAX_PROJECTS = 5;

export function SharedProjectView({
  name,
  rows,
}: {
  name: string;
  rows: BulkRow[];
}) {
  const router = useRouter();
  const [projectsState, setProjectsState] = useBulkProjects();
  const [copiedAll, setCopiedAll] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const urls = rows.map((r) => r.generatedUrl).filter(Boolean);

  async function copyAll() {
    if (urls.length === 0) return;
    try {
      await navigator.clipboard.writeText(urls.join("\n"));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1500);
    } catch {
      window.prompt("Copy these URLs:", urls.join("\n"));
    }
  }

  function importCopy() {
    setImportError(null);
    if (projectsState.projects.length >= MAX_PROJECTS) {
      setImportError(
        `You already have the maximum of ${MAX_PROJECTS} projects. Delete one, then import.`
      );
      return;
    }
    const newId = crypto.randomUUID();
    const newProject = {
      id: newId,
      name: `${name} (shared)`,
      rows: rows.map((r) => ({ ...r, id: crypto.randomUUID() })),
    };
    setProjectsState((prev) => ({
      projects: [...prev.projects, newProject],
      activeProjectId: newId,
    }));
    router.push("/bulk");
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{name}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {rows.length} row{rows.length === 1 ? "" : "s"} · read-only
          </p>
          {importError && (
            <p className="mt-2 text-sm text-red-600">{importError}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyAll}
            disabled={urls.length === 0}
            className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          >
            {copiedAll ? <Check size={16} /> : <Copy size={16} />}
            {copiedAll ? "Copied!" : "Copy All URLs"}
          </button>
          <button
            type="button"
            onClick={importCopy}
            className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <FolderPlus size={16} />
            Import into my Bulk Builder
          </button>
        </div>
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
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-2 py-8 text-center text-sm text-zinc-400"
                >
                  This shared project has no rows.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-zinc-100 align-top">
                  <td className="px-2 py-3 text-zinc-700">{row.baseUrl || "—"}</td>
                  <td className="px-2 py-3 text-zinc-700">{row.source || "—"}</td>
                  <td className="px-2 py-3 text-zinc-700">{row.medium || "—"}</td>
                  <td className="px-2 py-3 text-zinc-700">{row.campaign || "—"}</td>
                  <td className="px-2 py-3">
                    <code className="block break-all rounded-md bg-zinc-100 px-2.5 py-1.5 font-mono text-xs text-zinc-600">
                      {row.generatedUrl || "—"}
                    </code>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
