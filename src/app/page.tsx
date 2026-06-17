"use client";

import { useMemo, useState } from "react";
import { buildUtmUrl } from "@/lib/utm";

const inputClass =
  "w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm text-black placeholder:text-black/40 focus:border-black/30 focus:outline-none dark:border-white/15 dark:bg-black/20 dark:text-white dark:placeholder:text-white/40";

const labelClass = "block text-sm font-medium mb-1";

export default function Home() {
  const [baseUrl, setBaseUrl] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [keepCase, setKeepCase] = useState(false);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () =>
      buildUtmUrl(
        { baseUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent },
        { keepCase }
      ),
    [baseUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, keepCase]
  );

  const hasInput =
    baseUrl.trim() ||
    utmSource.trim() ||
    utmMedium.trim() ||
    utmCampaign.trim();

  async function handleCopy() {
    if (!result.ok) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold mb-1">UTM Builder</h1>
      <p className="text-sm text-black/60 dark:text-white/60 mb-8">
        Build a UTM-tagged URL, then copy it.
      </p>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className={labelClass} htmlFor="baseUrl">
            Base URL
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="utmSource">
              utm_source <span className="text-black/40 dark:text-white/40">*</span>
            </label>
            <input
              id="utmSource"
              className={inputClass}
              type="text"
              placeholder="google"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="utmMedium">
              utm_medium <span className="text-black/40 dark:text-white/40">*</span>
            </label>
            <input
              id="utmMedium"
              className={inputClass}
              type="text"
              placeholder="cpc"
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="utmCampaign">
            utm_campaign <span className="text-black/40 dark:text-white/40">*</span>
          </label>
          <input
            id="utmCampaign"
            className={inputClass}
            type="text"
            placeholder="spring_sale"
            value={utmCampaign}
            onChange={(e) => setUtmCampaign(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="utmTerm">
              utm_term
            </label>
            <input
              id="utmTerm"
              className={inputClass}
              type="text"
              placeholder="running+shoes"
              value={utmTerm}
              onChange={(e) => setUtmTerm(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="utmContent">
              utm_content
            </label>
            <input
              id="utmContent"
              className={inputClass}
              type="text"
              placeholder="logolink"
              value={utmContent}
              onChange={(e) => setUtmContent(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
          <input
            type="checkbox"
            checked={keepCase}
            onChange={(e) => setKeepCase(e.target.checked)}
          />
          Keep case for source/medium
        </label>
      </form>

      <div className="mt-8">
        <label className={labelClass}>Generated URL</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            readOnly
            rows={3}
            className={`${inputClass} resize-none font-mono text-xs`}
            value={result.ok ? result.url : ""}
            placeholder={
              hasInput && !result.ok
                ? result.error
                : "Fill in the fields above to build your URL"
            }
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!result.ok}
            className="shrink-0 rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {hasInput && !result.ok && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {result.error}
          </p>
        )}
      </div>
    </main>
  );
}
