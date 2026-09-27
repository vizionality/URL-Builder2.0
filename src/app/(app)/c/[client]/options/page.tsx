"use client";

import { useState } from "react";
import { X, DownloadCloud, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import {
  DEFAULT_UTM_OPTIONS,
  useGa4PropertyId,
  useUtmOptions,
} from "@/lib/storage";
import { defaultDateRange, fetchUtmBreakdown } from "@/lib/ga4";
import type { UtmOptions } from "@/lib/types";

type OptionKey = keyof UtmOptions;

function OptionListCard({
  title,
  values,
  onAdd,
  onRemove,
  onReset,
}: {
  title: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState("");

  function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  }

  return (
    <Card title={title}>
      <div className="flex gap-2">
        <input
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          type="text"
          placeholder="Add new…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="shrink-0 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Add
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {values.length === 0 && (
          <p className="text-sm text-zinc-400">No values yet.</p>
        )}
        {values.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700"
          >
            {value}
            <button
              type="button"
              onClick={() => onRemove(value)}
              aria-label={`Remove ${value}`}
              className="text-zinc-400 hover:text-red-600"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 text-sm font-medium text-zinc-500 hover:text-zinc-700"
      >
        Reset to Defaults
      </button>
    </Card>
  );
}

export default function UtmOptionsPage() {
  const [options, setOptions] = useUtmOptions();
  const [propertyId] = useGa4PropertyId();

  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function importFromGa4() {
    setImporting(true);
    setImportMessage(null);
    setImportError(null);
    try {
      const { startDate, endDate } = defaultDateRange(90);
      const found = await fetchUtmBreakdown({ propertyId, startDate, endDate });

      // Count what's actually new before merging, for the summary message.
      const addedSources = found.sources.filter(
        (v) => !options.sources.includes(v)
      ).length;
      const addedMediums = found.mediums.filter(
        (v) => !options.mediums.includes(v)
      ).length;
      const addedCampaigns = found.campaigns.filter(
        (v) => !options.campaigns.includes(v)
      ).length;

      const mergeUnique = (existing: string[], incoming: string[]) => {
        const seen = new Set(existing);
        const next = [...existing];
        for (const v of incoming) {
          if (!seen.has(v)) {
            seen.add(v);
            next.push(v);
          }
        }
        return next;
      };

      setOptions((prev) => ({
        sources: mergeUnique(prev.sources, found.sources),
        mediums: mergeUnique(prev.mediums, found.mediums),
        campaigns: mergeUnique(prev.campaigns, found.campaigns),
      }));

      const total = addedSources + addedMediums + addedCampaigns;
      setImportMessage(
        total === 0
          ? "Already up to date — no new values found in GA4."
          : `Imported ${addedSources} source${addedSources === 1 ? "" : "s"}, ${addedMediums} medium${addedMediums === 1 ? "" : "s"}, and ${addedCampaigns} campaign${addedCampaigns === 1 ? "" : "s"} from GA4.`
      );
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Failed to import from GA4."
      );
    } finally {
      setImporting(false);
    }
  }

  function addValue(key: OptionKey, value: string) {
    setOptions((prev) =>
      prev[key].includes(value)
        ? prev
        : { ...prev, [key]: [...prev[key], value] }
    );
  }

  function removeValue(key: OptionKey, value: string) {
    setOptions((prev) => ({
      ...prev,
      [key]: prev[key].filter((v) => v !== value),
    }));
  }

  function resetKey(key: OptionKey) {
    setOptions((prev) => ({ ...prev, [key]: DEFAULT_UTM_OPTIONS[key] }));
  }

  return (
    <>
      <Header
        title="UTM Options"
        subtitle="Manage the values available across the app"
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        {propertyId && (
          <div className="mb-6">
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">
                    Import from Google Analytics
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Pull the sources, mediums, and campaigns GA4 has seen in the
                    last 90 days into your option lists.
                  </p>
                  {importMessage && (
                    <p className="mt-2 text-sm font-medium text-green-700">
                      {importMessage}
                    </p>
                  )}
                  {importError && (
                    <p className="mt-2 text-sm text-red-600">{importError}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={importFromGa4}
                  disabled={importing}
                  className="inline-flex shrink-0 items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {importing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <DownloadCloud size={16} />
                      Import from GA4
                    </>
                  )}
                </button>
              </div>
            </Card>
          </div>
        )}
        <div data-tour="options-lists" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <OptionListCard
            title="Sources"
            values={options.sources}
            onAdd={(value) => addValue("sources", value)}
            onRemove={(value) => removeValue("sources", value)}
            onReset={() => resetKey("sources")}
          />
          <OptionListCard
            title="Mediums"
            values={options.mediums}
            onAdd={(value) => addValue("mediums", value)}
            onRemove={(value) => removeValue("mediums", value)}
            onReset={() => resetKey("mediums")}
          />
          <OptionListCard
            title="Campaigns"
            values={options.campaigns}
            onAdd={(value) => addValue("campaigns", value)}
            onRemove={(value) => removeValue("campaigns", value)}
            onReset={() => resetKey("campaigns")}
          />
        </div>

        <div className="mt-6">
          <Card title="About UTM Parameters">
            <div className="space-y-3 text-sm text-zinc-600">
              <p>
                <span className="font-medium text-zinc-900">utm_source</span> —
                where the traffic comes from, e.g. google, facebook, newsletter.
              </p>
              <p>
                <span className="font-medium text-zinc-900">utm_medium</span> —
                the marketing medium, e.g. cpc, email, social, banner.
              </p>
              <p>
                <span className="font-medium text-zinc-900">utm_campaign</span> —
                the specific campaign name, e.g. spring_sale, product_launch.
              </p>
              <p>
                These values populate the dropdowns in the Bulk Builder, so keeping
                this list consistent helps standardize campaign tracking across
                your team.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
