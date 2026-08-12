"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Trash2,
  Plus,
  Copy,
  Check,
  Save,
  ChevronDown,
  Pencil,
  X,
  Download,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { buildUtmUrl } from "@/lib/utm";
import { downloadCsv } from "@/lib/csv";
import { useBulkProjects, useGa4PropertyId, useUtmOptions } from "@/lib/storage";
import { defaultDateRange, fetchUtmBreakdown, isRealUtmValue } from "@/lib/ga4";
import type { BulkProject, BulkRow } from "@/lib/types";

const MAX_GA4_IMPORT_ROWS = 100;

const MAX_PROJECTS = 5;
const MAX_PROJECT_NAME_LENGTH = 30;

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
  const [projectsState, setProjectsState] = useBulkProjects();
  const [options, setOptions] = useUtmOptions();
  const [propertyId] = useGa4PropertyId();
  const range = useMemo(() => defaultDateRange(), []);
  const [importing, setImporting] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const activeProject =
    projectsState.projects.find(
      (p) => p.id === projectsState.activeProjectId
    ) ?? projectsState.projects[0];
  const rows = activeProject.rows;

  // A row counts as a UTM once it produces a valid generated URL.
  const countUtms = (projectRows: BulkRow[]) =>
    projectRows.filter((row) => generatedUrlFor(row) !== "").length;
  const projectCount = projectsState.projects.length;
  const utmsInProject = countUtms(rows);
  const totalUtms = projectsState.projects.reduce(
    (sum, project) => sum + countUtms(project.rows),
    0
  );

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setRenamingId(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setRenamingId(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function markSaved() {
    setSavedAt(nowLabel());
  }

  function updateActiveProjectRows(
    updater: (rows: BulkRow[]) => BulkRow[]
  ) {
    setProjectsState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === prev.activeProjectId ? { ...p, rows: updater(p.rows) } : p
      ),
    }));
    markSaved();
  }

  function updateRow(id: string, patch: Partial<BulkRow>) {
    updateActiveProjectRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        return { ...next, generatedUrl: generatedUrlFor(next) };
      })
    );
  }

  function addRow() {
    updateActiveProjectRows((prevRows) => [...prevRows, emptyRow()]);
  }

  // Ensure imported source/medium/campaign values exist in UTM Options so the
  // row dropdowns can display them.
  function mergeOptionValues(
    sources: Set<string>,
    mediums: Set<string>,
    campaigns: Set<string>
  ) {
    setOptions((prev) => {
      const merge = (existing: string[], incoming: Set<string>) => {
        const lower = new Set(existing.map((v) => v.toLowerCase()));
        const next = [...existing];
        for (const value of incoming) {
          if (!lower.has(value.toLowerCase())) {
            next.push(value);
            lower.add(value.toLowerCase());
          }
        }
        return next;
      };
      return {
        sources: merge(prev.sources, sources),
        mediums: merge(prev.mediums, mediums),
        campaigns: merge(prev.campaigns, campaigns),
      };
    });
  }

  async function importFromGa4() {
    if (!propertyId || importing) return;
    setImporting(true);
    try {
      const breakdown = await fetchUtmBreakdown(
        propertyId,
        range.startDate,
        range.endDate
      );

      const baseUrl = (
        window.prompt(
          "Optional: website URL to apply to all imported rows (leave blank to fill in later)."
        ) ?? ""
      ).trim();

      const existingKeys = new Set(
        activeProject.rows.map(
          (r) => `${r.baseUrl}|${r.source}|${r.medium}|${r.campaign}`
        )
      );
      const seen = new Set<string>();
      const sources = new Set<string>();
      const mediums = new Set<string>();
      const campaigns = new Set<string>();
      const newRows: BulkRow[] = [];

      for (const combo of breakdown) {
        // A useful row needs at least a tagged source and medium.
        if (!isRealUtmValue(combo.source) || !isRealUtmValue(combo.medium)) {
          continue;
        }
        const campaign = isRealUtmValue(combo.campaign) ? combo.campaign : "";
        const dedupeKey = `${combo.source}|${combo.medium}|${campaign}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const rowKey = `${baseUrl}|${combo.source}|${combo.medium}|${campaign}`;
        if (existingKeys.has(rowKey)) continue;

        sources.add(combo.source);
        mediums.add(combo.medium);
        if (campaign) campaigns.add(campaign);

        const row: BulkRow = {
          id: crypto.randomUUID(),
          baseUrl,
          source: combo.source,
          medium: combo.medium,
          campaign,
          generatedUrl: "",
        };
        newRows.push({ ...row, generatedUrl: generatedUrlFor(row) });
        if (newRows.length >= MAX_GA4_IMPORT_ROWS) break;
      }

      if (newRows.length === 0) {
        window.alert("No new campaigns to import from GA4.");
        return;
      }

      mergeOptionValues(sources, mediums, campaigns);
      updateActiveProjectRows((prevRows) => [...prevRows, ...newRows]);
      window.alert(`Imported ${newRows.length} row(s) from GA4.`);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to import from GA4."
      );
    } finally {
      setImporting(false);
    }
  }

  function deleteRow(id: string) {
    updateActiveProjectRows((prevRows) =>
      prevRows.filter((row) => row.id !== id)
    );
  }

  function clearAll() {
    if (rows.length === 0) return;
    if (!window.confirm("Delete all rows from this project?")) return;
    updateActiveProjectRows(() => []);
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

  function switchProject(id: string) {
    setProjectsState((prev) => ({ ...prev, activeProjectId: id }));
    setMenuOpen(false);
  }

  function createProject() {
    setProjectsState((prev) => {
      if (prev.projects.length >= MAX_PROJECTS) return prev;
      const newProject: BulkProject = {
        id: crypto.randomUUID(),
        name: `Project ${prev.projects.length + 1}`,
        rows: [emptyRow()],
      };
      return {
        projects: [...prev.projects, newProject],
        activeProjectId: newProject.id,
      };
    });
    setMenuOpen(false);
    markSaved();
  }

  function startRename(project: BulkProject) {
    setRenamingId(project.id);
    setRenameDraft(project.name);
  }

  function commitRename(id: string) {
    const trimmed = renameDraft.trim().slice(0, MAX_PROJECT_NAME_LENGTH);
    if (trimmed) {
      setProjectsState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === id ? { ...p, name: trimmed } : p
        ),
      }));
      markSaved();
    }
    setRenamingId(null);
  }

  function deleteProject(project: BulkProject) {
    if (projectsState.projects.length <= 1) return;
    if (
      !window.confirm(
        `Delete "${project.name}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setProjectsState((prev) => {
      const remaining = prev.projects.filter((p) => p.id !== project.id);
      let activeProjectId = prev.activeProjectId;
      if (activeProjectId === project.id) {
        const idx = prev.projects.findIndex((p) => p.id === project.id);
        const nearestIdx = Math.min(Math.max(idx - 1, 0), remaining.length - 1);
        activeProjectId = remaining[nearestIdx].id;
      }
      return { projects: remaining, activeProjectId };
    });
    markSaved();
  }

  return (
    <>
      <Header
        title="Bulk Builder"
        subtitle="Build multiple UTM URLs at once"
        onExport={handleExport}
        onSave={markSaved}
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Projects"
            value={String(projectCount)}
            sublabel={`Up to ${MAX_PROJECTS}`}
          />
          <StatCard
            label="UTMs in This Project"
            value={String(utmsInProject)}
            sublabel={activeProject.name}
          />
          <StatCard
            label="Total UTMs"
            value={String(totalUtms)}
            sublabel="Across all projects"
          />
        </div>
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Bulk UTM Builder
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
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
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex min-w-40 items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  <span className="truncate">{activeProject.name}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform ${
                      menuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {menuOpen && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
                    <ul className="max-h-64 overflow-y-auto">
                      {projectsState.projects.map((project) => {
                        const isActive = project.id === activeProject.id;
                        const isRenaming = renamingId === project.id;
                        return (
                          <li
                            key={project.id}
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-zinc-50"
                          >
                            {isRenaming ? (
                              <input
                                autoFocus
                                className="min-w-0 flex-1 rounded border border-green-500 px-2 py-1 text-sm text-zinc-900 focus:outline-none"
                                value={renameDraft}
                                maxLength={MAX_PROJECT_NAME_LENGTH}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitRename(project.id);
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                                onBlur={() => commitRename(project.id)}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => switchProject(project.id)}
                                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm"
                              >
                                <Check
                                  size={14}
                                  className={
                                    isActive ? "text-green-600" : "text-transparent"
                                  }
                                />
                                <span
                                  className={`truncate ${
                                    isActive
                                      ? "font-medium text-green-700"
                                      : "text-zinc-700"
                                  }`}
                                >
                                  {project.name}
                                </span>
                              </button>
                            )}
                            {!isRenaming && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startRename(project)}
                                  aria-label="Rename project"
                                  className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteProject(project)}
                                  disabled={projectsState.projects.length <= 1}
                                  aria-label="Delete project"
                                  className="shrink-0 rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-1 border-t border-zinc-100 pt-1">
                      <button
                        type="button"
                        onClick={createProject}
                        disabled={projectsState.projects.length >= MAX_PROJECTS}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent"
                      >
                        <Plus size={14} />
                        {projectsState.projects.length >= MAX_PROJECTS
                          ? "Maximum of 5 projects."
                          : "Create Project"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                <Plus size={16} />
                Add Row
              </button>
              {propertyId && (
                <button
                  type="button"
                  onClick={importFromGa4}
                  disabled={importing}
                  className="flex items-center gap-1.5 rounded-md border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-60"
                >
                  {importing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Download size={16} />
                  )}
                  {importing ? "Importing…" : "Import from GA4"}
                </button>
              )}
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
