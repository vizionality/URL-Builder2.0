import type { HealthConfig } from "./types";

// Every threshold has a documented default. In the Apps Script version these
// live on a Config tab; here they're seeded the same way and can later be
// overridden per-property. `property_id` is the one value with no default —
// a missing one fails loudly rather than dereferencing null at runtime.

export const CONFIG_DEFAULTS = {
  site_domain: "",
  key_events: "",
  lag_days: 2,
  baseline_weeks: 4,
  drop_pct_high: 70,
  drop_pct_medium: 40,
  spike_pct: 100,
  anomaly_pct: 40,
  min_event_volume: 10,
  min_sessions_traffic: 100,
  unassigned_share_max: 0.15,
  paid_no_campaign_share_max: 0.1,
  min_sessions_page: 50,
  top_pages: 10,
} as const;

function num(
  raw: Record<string, string | number | undefined>,
  key: keyof typeof CONFIG_DEFAULTS,
  fallback: number
): number {
  const v = raw[key];
  if (v === undefined || v === null || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : fallback;
}

/** Parse a raw key/value config (e.g. from a Config sheet) into HealthConfig. */
export function parseConfig(
  raw: Record<string, string | number | undefined>
): HealthConfig {
  const propertyId = String(raw.property_id ?? "").trim();
  if (!propertyId) {
    throw new Error(
      "Config error: `property_id` is required and was not set. Add it to the Config before running checks."
    );
  }

  const keyEvents = String(raw.key_events ?? CONFIG_DEFAULTS.key_events)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    propertyId,
    siteDomain: String(raw.site_domain ?? CONFIG_DEFAULTS.site_domain).trim(),
    keyEvents,
    lagDays: num(raw, "lag_days", CONFIG_DEFAULTS.lag_days),
    baselineWeeks: num(raw, "baseline_weeks", CONFIG_DEFAULTS.baseline_weeks),
    dropPctHigh: num(raw, "drop_pct_high", CONFIG_DEFAULTS.drop_pct_high),
    dropPctMedium: num(raw, "drop_pct_medium", CONFIG_DEFAULTS.drop_pct_medium),
    spikePct: num(raw, "spike_pct", CONFIG_DEFAULTS.spike_pct),
    anomalyPct: num(raw, "anomaly_pct", CONFIG_DEFAULTS.anomaly_pct),
    minEventVolume: num(raw, "min_event_volume", CONFIG_DEFAULTS.min_event_volume),
    minSessionsTraffic: num(
      raw,
      "min_sessions_traffic",
      CONFIG_DEFAULTS.min_sessions_traffic
    ),
    unassignedShareMax: num(
      raw,
      "unassigned_share_max",
      CONFIG_DEFAULTS.unassigned_share_max
    ),
    paidNoCampaignShareMax: num(
      raw,
      "paid_no_campaign_share_max",
      CONFIG_DEFAULTS.paid_no_campaign_share_max
    ),
    minSessionsPage: num(raw, "min_sessions_page", CONFIG_DEFAULTS.min_sessions_page),
    topPages: num(raw, "top_pages", CONFIG_DEFAULTS.top_pages),
  };
}
