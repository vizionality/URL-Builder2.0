"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy } from "lucide-react";
import { buildUtmUrl } from "@/lib/utm";
import { trackEvent, trackBuilderUsedNoSignup } from "@/lib/analytics";

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500";
const labelClass = "mb-1 block text-xs font-medium text-zinc-600";

const DEFAULT_URL = "https://example.com/sale";

export function HeroBuilder() {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_URL);
  const [source, setSource] = useState("google");
  const [medium, setMedium] = useState("cpc");
  const [campaign, setCampaign] = useState("2026_q1_summer_sale");
  const [copied, setCopied] = useState(false);
  const generatedOnce = useRef(false);

  const result = useMemo(
    () => buildUtmUrl({ baseUrl, source, medium, campaign }),
    [baseUrl, source, medium, campaign]
  );

  // Fire a micro-conversion the first time the visitor produces a valid URL.
  useEffect(() => {
    if (result.ok && !generatedOnce.current) {
      generatedOnce.current = true;
      trackBuilderUsedNoSignup();
    }
  }, [result.ok, source, medium]);

  async function handleCopy() {
    if (!result.ok) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    trackEvent("copy_utm", {
      source,
      medium,
      website_url: baseUrl.trim(),
      generated_url: result.url,
    });
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">Try it now</p>
        <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-medium text-green-700">
          No signup needed
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className={labelClass} htmlFor="hb-url">
            Website URL
          </label>
          <input
            id="hb-url"
            className={inputClass}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://example.com/landing"
            inputMode="url"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass} htmlFor="hb-source">
              Source
            </label>
            <input
              id="hb-source"
              className={inputClass}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="google"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="hb-medium">
              Medium
            </label>
            <input
              id="hb-medium"
              className={inputClass}
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder="cpc"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="hb-campaign">
              Campaign
            </label>
            <input
              id="hb-campaign"
              className={inputClass}
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder="summer_sale"
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1 text-xs font-medium text-zinc-600">Your UTM URL</p>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          {result.ok ? (
            <code className="block break-all font-mono text-xs leading-relaxed text-zinc-700">
              {result.url}
            </code>
          ) : (
            <p className="text-xs text-zinc-400">{result.error}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!result.ok}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {copied ? (
            <>
              <Check size={15} /> Copied!
            </>
          ) : (
            <>
              <Copy size={15} /> Copy URL
            </>
          )}
        </button>
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-4">
        <Link
          href="/sign-up"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-green-700 hover:underline"
        >
          Create a free account to save &amp; build in bulk
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
