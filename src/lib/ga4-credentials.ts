// Parses the GA4 service-account key from the GA4_SA_KEY env var.
//
// Accepts either raw service-account JSON or a base64-encoded version of it.
// base64 is the recommended form for env vars: it's a single line with no
// quotes, whitespace, or newlines, so it can't be mangled by copy/paste.
export type ServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

export function parseServiceAccountKey(raw: string): ServiceAccountCredentials {
  const trimmed = raw.trim();
  // Raw JSON starts with "{"; anything else is treated as base64.
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : Buffer.from(trimmed, "base64").toString("utf8").trim();
  return JSON.parse(jsonText) as ServiceAccountCredentials;
}
