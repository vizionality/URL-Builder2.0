"use client";

import { useEffect, useRef, useState } from "react";
import {
  Trash2,
  Plus,
  Copy,
  Check,
  Save,
  ChevronDown,
  Pencil,
  X,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { buildUtmUrl } from "@/lib/utm";
import { downloadCsv } from "@/lib/csv";
import { STORAGE_KEYS, useUtmOptions } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { useWorkspace } from "@/lib/workspace-context";
import {
  MAX_PROJECTS_PER_WORKSPACE,
  createProject as createProjectApi,
  deleteProject as deleteProjectApi,
  listProjects,
  renameProject as renameProjectApi,
  updateProjectRows,
} from "@/lib/supabase/projects";
import type { BulkProjectsState, BulkRow, WorkspaceProject } from "@/lib/types";

const MAX_PROJECT_NAME_LENGTH = 30;
const SAVE_DEBOUNCE_MS = 600;

const cellInputClass =
  "w-full min-w-32 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400";

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

// One-time migration: if this workspace has no projects yet but the old
// localStorage-backed bulk builder has data, copy it in and clear the key
// so it never gets re-imported.
async function importLegacyProjects(
  supabase: ReturnType<typeof createClient>,
  workspaceId: string
): Promise<WorkspaceProject[]> {
  const raw = window.localStorage.getItem(STORAGE_KEYS.bulkProjects);
  if (!raw) return [];

  let parsed: BulkProjectsState | null = null;
  try {
    parsed = JSON.parse(raw) as BulkProjectsState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEYS.bulkProjects);
    return [];
  }

  if (!parsed?.projects?.length) {
    window.localStorage.removeItem(STORAGE_KEYS.bulkProjects);
    return [];
  }

  const toImport = parsed.projects.slice(0, MAX_PROJECTS_PER_WORKSPACE);
  const created: WorkspaceProject[] = [];
  for (const project of toImport) {
    const result = await createProjectApi(
      supabase,
      workspaceId,
      project.name,
      project.rows
    );
    created.push(result);
  }
  window.localStorage.removeItem(STORAGE_KEYS.bulkProjects);
  return created;
}

export default function BulkBuilderPage() {
  const { activeWorkspace, loading: workspaceLoading } = useWorkspace();
  const [options] = useUtmOptions();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isViewer = activeWorkspace?.role === "viewer";

  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? projects[0] ?? null;
  const rows = activeProject?.rows ?? [];

  useEffect(() => {
    if (!activeWorkspace) return;
    const workspaceId = activeWorkspace.id;
    let cancelled = false;

    async function load() {
      setProjectsLoading(true);
      const supabase = createClient();
      let list = await listProjects(supabase, workspaceId);
      if (!cancelled && list.length === 0) {
        list = await importLegacyProjects(supabase, workspaceId);
      }
      if (!cancelled && list.length === 0) {
        const created = await createProjectApi(
          supabase,
          workspaceId,
          "Project 1",
          [emptyRow()]
        );
        list = [created];
      }
      if (!cancelled) {
        setProjects(list);
        setActiveProjectId(list[0]?.id ?? null);
        setProjectsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace]);

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

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  function markSaved() {
    setSavedAt(nowLabel());
  }

  function scheduleSave(projectId: string, nextRows: BulkRow[]) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const supabase = createClient();
      updateProjectRows(supabase, projectId, nextRows).then(markSaved);
    }, SAVE_DEBOUNCE_MS);
  }

  function updateActiveProjectRows(updater: (rows: BulkRow[]) => BulkRow[]) {
    if (!activeProject) return;
    const nextRows = updater(activeProject.rows);
    setProjects((prev) =>
      prev.map((p) => (p.id === activeProject.id ? { ...p, rows: nextRows } : p))
    );
    scheduleSave(activeProject.id, nextRows);
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
    if (isViewer) return;
    updateActiveProjectRows((prevRows) => [...prevRows, emptyRow()]);
  }

  function deleteRow(id: string) {
    if (isViewer) return;
    updateActiveProjectRows((prevRows) => prevRows.filter((row) => row.id !== id));
  }

  function clearAll() {
    if (isViewer || rows.length === 0) return;
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
    setActiveProjectId(id);
    setMenuOpen(false);
  }

  async function createProject() {
    if (isViewer || !activeWorkspace || projects.length >= MAX_PROJECTS_PER_WORKSPACE) {
      return;
    }
    const supabase = createClient();
    const newProject = await createProjectApi(
      supabase,
      activeWorkspace.id,
      `Project ${projects.length + 1}`,
      [emptyRow()]
    );
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setMenuOpen(false);
    markSaved();
  }

  function startRename(project: WorkspaceProject) {
    if (isViewer) return;
    setRenamingId(project.id);
    setRenameDraft(project.name);
  }

  async function commitRename(id: string) {
    const trimmed = renameDraft.trim().slice(0, MAX_PROJECT_NAME_LENGTH);
    setRenamingId(null);
    if (!trimmed) return;
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: trimmed } : p)));
    const supabase = createClient();
    await renameProjectApi(supabase, id, trimmed);
    markSaved();
  }

  async function deleteProject(project: WorkspaceProject) {
    if (isViewer || projects.length <= 1) return;
    if (!window.confirm(`Delete "${project.name}"? This cannot be undone.`)) return;

    const supabase = createClient();
    await deleteProjectApi(supabase, project.id);

    const idx = projects.findIndex((p) => p.id === project.id);
    const remaining = projects.filter((p) => p.id !== project.id);
    setProjects(remaining);
    if (activeProjectId === project.id) {
      const nearestIdx = Math.min(Math.max(idx - 1, 0), remaining.length - 1);
      setActiveProjectId(remaining[nearestIdx]?.id ?? null);
    }
    markSaved();
  }

  const isLoading = workspaceLoading || projectsLoading || !activeProject;

  return (
    <>
      <Header
        title="Bulk Builder"
        subtitle="Build multiple UTM URLs at once"
        onExport={handleExport}
        onSave={markSaved}
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <Card>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-400">
              <Loader2 size={24} className="animate-spin" />
              <p className="text-sm">Loading projects…</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">
                    Bulk UTM Builder
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Build multiple UTM URLs at once using spreadsheet-style input
                  </p>
                  {isViewer && (
                    <p className="mt-2 text-xs font-medium text-zinc-500">
                      You have view-only access to this workspace.
                    </p>
                  )}
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
                          {projects.map((project) => {
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
                                      disabled={isViewer}
                                      aria-label="Rename project"
                                      className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteProject(project)}
                                      disabled={isViewer || projects.length <= 1}
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
                            disabled={isViewer || projects.length >= MAX_PROJECTS_PER_WORKSPACE}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent"
                          >
                            <Plus size={14} />
                            {projects.length >= MAX_PROJECTS_PER_WORKSPACE
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
                    disabled={isViewer}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={16} />
                    Add Row
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={isViewer || rows.length === 0}
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
                      <tr key={row.id} className="border-b border-zinc-100 align-top">
                        <td className="px-2 py-3">
                          <input
                            className={cellInputClass}
                            type="text"
                            placeholder="https://example.com"
                            value={row.baseUrl}
                            disabled={isViewer}
                            onChange={(e) =>
                              updateRow(row.id, { baseUrl: e.target.value })
                            }
                          />
                        </td>
                        <td className="px-2 py-3">
                          <select
                            className={cellInputClass}
                            value={row.source}
                            disabled={isViewer}
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
                            disabled={isViewer}
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
                            disabled={isViewer}
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
                            disabled={isViewer}
                            aria-label="Delete row"
                            className="rounded-md border border-zinc-200 p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
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
            </>
          )}
        </Card>
      </main>
    </>
  );
}
