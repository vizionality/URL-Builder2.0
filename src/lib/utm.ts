export type UtmFields = {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
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
  const content = fields.content?.trim() ?? "";

  if (!baseUrl) {
    return { ok: false, error: "Enter a website URL." };
  }
  // new URL() silently percent-encodes interior spaces during validation, but
  // we assemble the output from the raw string — so a space would survive into
  // the final URL and break it. Reject it with a clear message instead.
  if (/\s/.test(baseUrl)) {
    return { ok: false, error: "Remove spaces from the website URL." };
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

  if (content) {
    params.push(["utm_content", content]);
  }

  const queryString = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  const hashIndex = baseUrl.indexOf("#");
  const fragment = hashIndex === -1 ? "" : baseUrl.slice(hashIndex);
  const beforeFragment = hashIndex === -1 ? baseUrl : baseUrl.slice(0, hashIndex);

  // Choose the separator: "?" when there's no query yet, "&" when a non-empty
  // query already exists, and "" when the base ends in a bare "?" (empty query)
  // so we don't emit a stray leading "&".
  const qIndex = beforeFragment.indexOf("?");
  let separator: string;
  if (qIndex === -1) {
    separator = "?";
  } else if (qIndex === beforeFragment.length - 1) {
    separator = "";
  } else {
    separator = "&";
  }
  const url = `${beforeFragment}${separator}${queryString}${fragment}`;

  return { ok: true, url };
}
