"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { downloadCsv } from "@/lib/csv";
import { distinctCampaignCount, useBulkRows, useSavedUrls, useUtmOptions } from "@/lib/storage";

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

const labelClass = "block text-sm font-medium text-zinc-700 mb-1";

const QUARTERS = [
  { value: "q1", label: "Q1" },
  { value: "q2", label: "Q2" },
  { value: "q3", label: "Q3" },
  { value: "q4", label: "Q4" },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function CampaignCreatorPage() {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState("q1");
  const [initiative, setInitiative] = useState("");
  const [description, setDescription] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [savedUrls] = useSavedUrls();
  const [bulkRows] = useBulkRows();
  const [options, setOptions] = useUtmOptions();

  const activeCampaigns = distinctCampaignCount(savedUrls, bulkRows);
  const generatedName = useMemo(() => {
    if (!initiative.trim()) return "";
    return `${year}_${quarter}_${initiative}`;
  }, [year, quarter, initiative]);

  function handleClear() {
    setInitiative("");
    setDescription("");
    setSuggestions([]);
    setAiError(null);
  }

  async function handleCopy() {
    if (!generatedName) return;
    await navigator.clipboard.writeText(generatedName);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleGenerateSuggestions() {
    if (!description.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/suggest-initiatives", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate suggestions.");
      }
      setSuggestions(data.suggestions ?? []);
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "Failed to generate suggestions."
      );
    } finally {
      setAiLoading(false);
    }
  }

  function handleSave() {
    if (!generatedName) return;
    setOptions((prev) =>
      prev.campaigns.includes(generatedName)
        ? prev
        : { ...prev, campaigns: [...prev.campaigns, generatedName] }
    );
  }

  function handleExport() {
    downloadCsv(
      "campaign-names.csv",
      options.campaigns.map((name) => ({ campaign: name }))
    );
  }

  return (
    <>
      <Header
        title="Campaign Creator"
        subtitle="Generate standardized campaign names"
        onExport={handleExport}
        onSave={handleSave}
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Active Campaigns"
            value={String(activeCampaigns)}
            sublabel="From bulk builder"
          />
          <StatCard label="Campaign Types" value="4" sublabel="Quarterly" />
          <StatCard
            label="Name Format"
            value="Standard"
            sublabel="year_quarter_initiative"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Create Campaign Name">
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="year">
                    Year
                  </label>
                  <select
                    id="year"
                    className={inputClass}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="quarter">
                    Quarter
                  </label>
                  <select
                    id="quarter"
                    className={inputClass}
                    value={quarter}
                    onChange={(e) => setQuarter(e.target.value)}
                  >
                    {QUARTERS.map((q) => (
                      <option key={q.value} value={q.value}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="initiative">
                  Initiative
                </label>
                <input
                  id="initiative"
                  className={inputClass}
                  type="text"
                  placeholder="summer_sale"
                  value={initiative}
                  onChange={(e) => setInitiative(slugify(e.target.value))}
                />
                <p className="mt-1 text-xs text-zinc-400">
                  Automatically lowercased and underscored.
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="description">
                  AI Initiative Suggestions
                </label>
                <textarea
                  id="description"
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder="Describe the campaign, e.g. a summer clearance sale on outdoor gear"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleGenerateSuggestions}
                  disabled={!description.trim() || aiLoading}
                  className="mt-2 rounded-md border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"
                >
                  {aiLoading ? "Generating…" : "Generate AI Suggestions"}
                </button>
                {aiError && (
                  <p className="mt-2 text-sm text-red-600">{aiError}</p>
                )}
                {suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInitiative(s)}
                        className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
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

          <Card title="Generated Campaign Name">
            {generatedName ? (
              <div className="space-y-3">
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 font-mono text-sm text-zinc-900">
                  {generatedName}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  {copied ? "Copied!" : "Copy Name"}
                </button>
              </div>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">
                Enter an initiative to generate your campaign name
              </div>
            )}
          </Card>
        </div>
      </main>
    </>
  );
}
