// Shared types for the attribution pipeline. The capture snippet sends a raw
// touch shaped like the object it assembles in the browser; the server
// normalizes it into a TouchRow before storing.

export type RawTouch = {
  // UTM and click identifiers arrive as flat keys on the captured object.
  [key: string]: unknown;
  referrer?: string;
  landing_page?: string;
  timestamp?: string;
  is_organic?: boolean;
};

export type TouchRow = {
  occurredAt: string; // ISO timestamp
  source: string | null;
  medium: string | null;
  campaign: string | null;
  term: string | null;
  content: string | null;
  clickIds: Record<string, string>;
  referrer: string | null;
  landingPage: string | null;
  isOrganic: boolean;
};

export type CollectBody = {
  site_key?: unknown;
  visitor_id?: unknown;
  touches?: unknown;
  conversion?: unknown;
};

export type ConversionInput = {
  name: string;
  value: number | null;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export const UTM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

// Ad-network click identifiers we recognize and fold into click_ids.
export const CLICK_FIELDS = [
  "gclid",
  "gbraid",
  "wbraid",
  "dclid",
  "gclsrc",
  "gad_source",
  "srsltid",
  "msclkid",
  "fbclid",
  "ttclid",
  "li_fat_id",
  "twclid",
  "epik",
  "irclickid",
  "rdt_cid",
  "sccid",
  "obclid",
  "yclid",
  "cjevent",
  "wickedid",
] as const;
