"use client";

import { useMemo, useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Card } from "@/components/Card";
import { downloadCsv } from "@/lib/csv";
import { DEFAULT_UTM_OPTIONS, useGa4PropertyId, useUtmOptions } from "@/lib/storage";
import { defaultDateRange, fetchUtmBreakdown, isRealUtmValue } from "@/lib/ga4";
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
  const range = useMemo(() => defaultDateRange(), []);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  async function handleImportFromGa4() {
    if (!propertyId) return;
    setImporting(true);
    setImportMessage(null);
    try {
      const rows = await fetchUtmBreakdown(propertyId, range.startDate, range.endDate);
      const sources = new Set<string>();
      const mediums = new Set<string>();
      const campaigns = new Set<string>();
      for (const row of rows) {
        if (isRealUtmValue(row.source)) sources.add(row.source);
        if (isRealUtmValue(row.medium)) mediums.add(row.medium);
        if (isRealUtmValue(row.campaign)) campaigns.add(row.campaign);
      }
      let added = 0;
      setOptions((prev) => {
        const merge = (existing: string[], incoming: Set<string>) => {
          const lower = new Set(existing.map((v) => v.toLowerCase()));
          const next = [...existing];
          for (const value of incoming) {
            if (!lower.has(value.toLowerCase())) {
              next.push(value);
              lower.add(value.toLowerCase());
              added += 1;
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
      setImportMessage(
        added > 0
          ? `Added ${added} new value${added === 1 ? "" : "s"} from GA4.`
          : "No new values — everything GA4 reported is already in your options."
      );
    } catch (err) {
      setImportMessage(
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

  function handleExport() {
    const rows: Record<string, string>[] = [];
    options.sources.forEach((value) => rows.push({ type: "source", value }));
    options.mediums.forEach((value) => rows.push({ type: "medium", value }));
    options.campaigns.forEach((value) => rows.push({ type: "campaign", value }));
    downloadCsv("utm-options.csv", rows);
  }

  return (
    <>
      <Header
        title="UTM Options"
        subtitle="Manage the values available across the app"
        onExport={handleExport}
        onSave={() => {}}
      />
      <main className="flex-1 px-4 py-6 sm:px-6">
        {propertyId && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleImportFromGa4}
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
            {importMessage && (
              <span className="text-sm text-zinc-500">{importMessage}</span>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
