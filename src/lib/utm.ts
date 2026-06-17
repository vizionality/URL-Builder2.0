export type UtmFields = {
  baseUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm?: string;
  utmContent?: string;
};

export type BuildUtmUrlOptions = {
  keepCase?: boolean;
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

export function buildUtmUrl(
  fields: UtmFields,
  options: BuildUtmUrlOptions = {}
): BuildUtmUrlResult {
  const baseUrl = fields.baseUrl.trim();
  const utmSource = fields.utmSource.trim();
  const utmMedium = fields.utmMedium.trim();
  const utmCampaign = fields.utmCampaign.trim();
  const utmTerm = fields.utmTerm?.trim() ?? "";
  const utmContent = fields.utmContent?.trim() ?? "";

  if (!isValidHttpUrl(baseUrl)) {
    return { ok: false, error: "Enter a valid http(s) URL." };
  }
  if (!utmSource || !utmMedium || !utmCampaign) {
    return {
      ok: false,
      error: "utm_source, utm_medium, and utm_campaign are required.",
    };
  }

  const normalize = (value: string) =>
    options.keepCase ? value : value.toLowerCase();

  const params: [string, string][] = [
    ["utm_source", normalize(utmSource)],
    ["utm_medium", normalize(utmMedium)],
    ["utm_campaign", utmCampaign],
  ];
  if (utmTerm) params.push(["utm_term", utmTerm]);
  if (utmContent) params.push(["utm_content", utmContent]);

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
