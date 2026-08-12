"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FolderPlus, ChevronDown, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { buildUtmUrl } from "@/lib/utm";
import { utmTemplates, templatePlatformOrder } from "@/lib/utmTemplates";
import { downloadCsv } from "@/lib/csv";
import { useBulkProjects, useSavedUrls, useUtmOptions } from "@/lib/storage";
import type { BulkRow } from "@/lib/types";

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

const labelClass = "block text-sm font-medium text-zinc-700 mb-1";

export default function Home() {
  const [baseUrl, setBaseUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [copied, setCopied] = useState(false);

  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [addedTo, setAddedTo] = useState<string | null>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  const [savedUrls, setSavedUrls] = useSavedUrls();
  const [projectsState, setProjectsState] = useBulkProjects();
  const [, setOptions] = useUtmOptions();

  const result = useMemo(
    () => buildUtmUrl({ baseUrl, source, medium, campaign, content }),
    [baseUrl, source, medium, campaign, content]
  );

  const hasInput =
    baseUrl.trim() ||
    source.trim() ||
    medium.trim() ||
    campaign.trim() ||
    content.trim();

  // Add any chosen source/medium/campaign values to UTM Options so they
  // populate (and prefill) the Bulk Builder dropdowns instead of showing blank.
  function ensureOptions(
    nextSource: string,
    nextMedium: string,
    nextCampaign: string
  ) {
    const s = nextSource.trim();
    const m = nextMedium.trim();
    const c = nextCampaign.trim();
    setOptions((prev) => {
      const sources = s && !prev.sources.includes(s) ? [...prev.sources, s] : prev.sources;
      const mediums = m && !prev.mediums.includes(m) ? [...prev.mediums, m] : prev.mediums;
      const campaigns =
        c && !prev.campaigns.includes(c) ? [...prev.campaigns, c] : prev.campaigns;
      if (
        sources === prev.sources &&
        mediums === prev.mediums &&
        campaigns === prev.campaigns
      ) {
        return prev;
      }
      return { sources, mediums, campaigns };
    });
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const template = utmTemplates.find((t) => t.id === id);
    if (!template) return;
    // Only overwrite utm_* fields; preserve any Website URL already typed.
    setSource(template.source);
    setMedium(template.medium);
    setContent(template.content ?? "");
    if (template.campaign) {
      setCampaign(template.campaign);
    }
    // Auto-add the template's values so the Bulk Builder dropdowns include them.
    ensureOptions(template.source, template.medium, template.campaign ?? "");
  }

  function handleClear() {
    setBaseUrl("");
    setSource("");
    setMedium("");
    setCampaign("");
    setContent("");
    setTemplateId("");
  }

  async function handleCopy() {
    if (!result.ok) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function addToProject(projectId: string, projectName: string) {
    if (!result.ok) return;
    // Ensure the row's values exist in UTM Options so its Bulk Builder
    // dropdowns prefill instead of rendering blank.
    ensureOptions(source, medium, campaign);
    const newRow: BulkRow = {
      id: crypto.randomUUID(),
      baseUrl: baseUrl.trim(),
      source: source.trim(),
      medium: medium.trim(),
      campaign: campaign.trim(),
      generatedUrl: result.url,
    };
    setProjectsState((prev) => ({
      ...prev,
      projects: prev.projects.map((project) =>
        project.id === projectId
          ? { ...project, rows: [...project.rows, newRow] }
          : project
      ),
    }));
    setProjectMenuOpen(false);
    setAddedTo(projectName);
    setTimeout(() => setAddedTo((name) => (name === projectName ? null : name)), 2000);
  }

  function handleSave() {
    if (!result.ok) return;
    setSavedUrls((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        baseUrl: baseUrl.trim(),
        source: source.trim(),
        medium: medium.trim(),
        campaign: campaign.trim(),
        generatedUrl: result.url,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function handleExport() {
    downloadCsv(
      "utm-urls.csv",
      savedUrls.map((row) => ({
        baseUrl: row.baseUrl,
        source: row.source,
        medium: row.medium,
        campaign: row.campaign,
        generatedUrl: row.generatedUrl,
        createdAt: row.createdAt,
      }))
    );
  }

  useEffect(() => {
    if (!projectMenuOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(e.target as Node)
      ) {
        setProjectMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setProjectMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [projectMenuOpen]);

  return (
    <>
      <Header
        title="UTM Builder"
        subtitle="Build and customize your campaign tracking URLs"
        onExport={handleExport}
        onSave={handleSave}
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card
            title="Build Your UTM URL"
            description="Fill in the required fields to generate a tagged URL."
          >
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className={labelClass} htmlFor="template">
                  Quick Template
                </label>
                <select
                  id="template"
                  className={inputClass}
                  value={templateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  <option value="">Select a template…</option>
                  {templatePlatformOrder.map((platform) => (
                    <optgroup key={platform} label={platform}>
                      {utmTemplates
                        .filter((t) => t.platform === platform)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="baseUrl">
                  Website URL <span className="text-green-600">*</span>
                </label>
                <input
                  id="baseUrl"
                  className={inputClass}
                  type="text"
                  placeholder="https://example.com/landing"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="source">
                  UTM Source <span className="text-green-600">*</span>
                </label>
                <input
                  id="source"
                  className={inputClass}
                  type="text"
                  placeholder="google"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="medium">
                  UTM Medium <span className="text-green-600">*</span>
                </label>
                <input
                  id="medium"
                  className={inputClass}
                  type="text"
                  placeholder="cpc"
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="campaign">
                  UTM Campaign <span className="text-green-600">*</span>
                </label>
                <input
                  id="campaign"
                  className={inputClass}
                  type="text"
                  placeholder="spring_sale"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Use lowercase letters, numbers, and underscores, e.g. spring_sale.
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="content">
                  UTM Content
                </label>
                <input
                  id="content"
                  className={inputClass}
                  type="text"
                  placeholder="reel"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleClear}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Clear Form
              </button>
            </form>
          </Card>

          <Card title="Generated UTM URL">
            {result.ok ? (
              <div className="space-y-3">
                <textarea
                  readOnly
                  rows={4}
                  className={`${inputClass} resize-none font-mono text-xs`}
                  value={result.url}
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  {copied ? "Copied!" : "Copy URL"}
                </button>

                <div className="relative" ref={projectMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProjectMenuOpen((open) => !open)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <FolderPlus size={16} />
                    Add to Project
                    <ChevronDown
                      size={16}
                      className={`transition-transform ${
                        projectMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {projectMenuOpen && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
                      <p className="px-2 py-1.5 text-xs font-medium text-zinc-400">
                        Add this URL as a row in…
                      </p>
                      <ul className="max-h-64 overflow-y-auto">
                        {projectsState.projects.map((project) => (
                          <li key={project.id}>
                            <button
                              type="button"
                              onClick={() => addToProject(project.id, project.name)}
                              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-green-50 hover:text-green-700"
                            >
                              <span className="truncate">{project.name}</span>
                              <span className="shrink-0 text-xs text-zinc-400">
                                {project.rows.length} row
                                {project.rows.length === 1 ? "" : "s"}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {addedTo && (
                  <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-green-600">
                    <Check size={14} />
                    Added to {addedTo}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">
                {hasInput
                  ? result.error
                  : "Fill in the required fields to generate your UTM URL"}
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
