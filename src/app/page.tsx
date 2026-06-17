"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/Card";
import { buildUtmUrl } from "@/lib/utm";
import { downloadCsv } from "@/lib/csv";
import {
  distinctCampaignCount,
  useBulkRows,
  useGa4PropertyId,
  useSavedUrls,
} from "@/lib/storage";
import {
  SAMPLE_CLICKS,
  SAMPLE_ENGAGEMENT_RATE,
  defaultDateRange,
  useGa4Summary,
} from "@/lib/ga4";

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";

const labelClass = "block text-sm font-medium text-zinc-700 mb-1";

export default function Home() {
  const [baseUrl, setBaseUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [copied, setCopied] = useState(false);

  const [savedUrls, setSavedUrls] = useSavedUrls();
  const [bulkRows] = useBulkRows();
  const [propertyId] = useGa4PropertyId();
  const { startDate, endDate } = useMemo(() => defaultDateRange(), []);
  const ga4 = useGa4Summary(propertyId, startDate, endDate);

  const result = useMemo(
    () => buildUtmUrl({ baseUrl, source, medium, campaign }),
    [baseUrl, source, medium, campaign]
  );

  const hasInput =
    baseUrl.trim() || source.trim() || medium.trim() || campaign.trim();

  const activeCampaigns = distinctCampaignCount(savedUrls, bulkRows);
  const clicksValue = propertyId
    ? ga4.data
      ? ga4.data.totalSessions.toLocaleString()
      : ga4.loading
        ? "…"
        : "0"
    : SAMPLE_CLICKS.toLocaleString();
  const engagementValue = propertyId
    ? ga4.data
      ? `${ga4.data.avgEngagementRate.toFixed(1)}%`
      : ga4.loading
        ? "…"
        : "0%"
    : `${SAMPLE_ENGAGEMENT_RATE.toFixed(1)}%`;

  function handleClear() {
    setBaseUrl("");
    setSource("");
    setMedium("");
    setCampaign("");
  }

  async function handleCopy() {
    if (!result.ok) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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

  return (
    <>
      <Header
        title="UTM Builder"
        subtitle="Build and customize your campaign tracking URLs"
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
          <StatCard
            label="Clicks"
            value={clicksValue}
            sublabel={propertyId ? "From GA4" : "Sample data"}
            sample={!propertyId}
          />
          <StatCard
            label="Engagement Rate"
            value={engagementValue}
            sublabel={propertyId ? "From GA4" : "Sample data"}
            sample={!propertyId}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card
            title="Build Your UTM URL"
            description="Fill in the required fields to generate a tagged URL."
          >
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
