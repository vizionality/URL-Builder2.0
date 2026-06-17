export type UtmFields = {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
};

export type BuildUtmUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildUtmUrl(fields: UtmFields): BuildUtmUrlResult {
  const baseUrl = fields.baseUrl.trim();
  const source = fields.source.trim();
  const medium = fields.medium.trim();
  const campaign = fields.campaign.trim();

  if (!baseUrl) {
    return { ok: false, error: "Enter a website URL." };
  }
  if (!isValidHttpUrl(baseUrl)) {
    return { ok: false, error: "Enter a valid http(s) URL." };
  }
  if (!source || !medium || !campaign) {
    return {
      ok: false,
      error: "UTM Source, UTM Medium, and UTM Campaign are required.",
    };
  }

  const params: [string, string][] = [
    ["utm_source", source],
    ["utm_medium", medium],
    ["utm_campaign", campaign],
  ];

  const queryString = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  const hashIndex = baseUrl.indexOf("#");
  const fragment = hashIndex === -1 ? "" : baseUrl.slice(hashIndex);
  const beforeFragment = hashIndex === -1 ? baseUrl : baseUrl.slice(0, hashIndex);

  const separator = beforeFragment.includes("?") ? "&" : "?";
  const url = `${beforeFragment}${separator}${queryString}${fragment}`;

  return { ok: true, url };
}
