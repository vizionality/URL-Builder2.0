// Map a raw touch to a channel group, the way a marketer reads it. Priority:
// paid click ids first (they are unambiguous), then the UTM medium, then the
// source, then the referrer host, and finally Direct when nothing is known.

export type ChannelInput = {
  source: string | null;
  medium: string | null;
  clickIds: Record<string, string>;
  referrer: string | null;
};

export type Channel =
  | "Paid Search"
  | "Paid Social"
  | "Display"
  | "Organic Search"
  | "Organic Social"
  | "Email"
  | "Affiliate"
  | "Referral"
  | "Direct";

const SEARCH_HOSTS = ["google", "bing", "yahoo", "duckduckgo", "ecosia", "baidu", "yandex"];
const SOCIAL_HOSTS = [
  "facebook", "instagram", "twitter", "x", "linkedin", "tiktok",
  "pinterest", "reddit", "snapchat", "youtube", "threads",
];

const PAID_SEARCH_CLICK = ["gclid", "gbraid", "wbraid", "dclid", "msclkid", "yclid"];
const PAID_SOCIAL_CLICK = ["fbclid", "ttclid", "twclid", "li_fat_id", "epik", "rdt_cid", "sccid"];

function hostOf(url: string): string {
  try {
    return url.split("/")[2].split(":")[0].toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function matchesAny(value: string, needles: string[]): boolean {
  return needles.some((n) => value.includes(n));
}

export function channelOf(input: ChannelInput): Channel {
  const source = (input.source ?? "").toLowerCase();
  const medium = (input.medium ?? "").toLowerCase();
  const clicks = Object.keys(input.clickIds ?? {});

  // 1. Paid click identifiers are unambiguous.
  if (clicks.some((c) => PAID_SOCIAL_CLICK.includes(c))) return "Paid Social";
  if (clicks.some((c) => PAID_SEARCH_CLICK.includes(c))) return "Paid Search";

  // 2. UTM medium.
  if (/^(cpc|ppc|paid|paidsearch|sem)$/.test(medium)) return "Paid Search";
  if (/^(display|cpm|banner|gdn)$/.test(medium)) return "Display";
  if (/^(paid_social|paidsocial|social_paid)$/.test(medium)) return "Paid Social";
  if (/^(social|social-network|sm)$/.test(medium)) return "Organic Social";
  if (/^(email|e-mail|newsletter)$/.test(medium)) return "Email";
  if (/^(affiliate|affiliates)$/.test(medium)) return "Affiliate";
  if (medium === "organic") return "Organic Search";
  if (medium === "referral") return "Referral";

  // 3. Source.
  if (matchesAny(source, SOCIAL_HOSTS)) return "Organic Social";
  if (matchesAny(source, SEARCH_HOSTS)) return "Organic Search";
  if (source === "newsletter" || source.includes("mail")) return "Email";

  // 4. Referrer host (untagged external visits).
  const refHost = hostOf(input.referrer ?? "");
  if (refHost) {
    if (matchesAny(refHost, SEARCH_HOSTS)) return "Organic Search";
    if (matchesAny(refHost, SOCIAL_HOSTS)) return "Organic Social";
    return "Referral";
  }

  return "Direct";
}
