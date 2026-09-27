// Match a client's website to a Search Console property. Unit-tested.

// "https://www.Example.com/path" -> "example.com"
export function hostOf(input: string): string {
  const raw = input.trim().toLowerCase();
  if (!raw) return "";
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// The best site for a website: its domain property first, then a URL-prefix
// property on the same host. Null when nothing matches.
export function matchSite(website: string, sites: string[]): string | null {
  const host = hostOf(website);
  if (!host) return null;
  const domain = sites.find((s) => s.toLowerCase() === `sc-domain:${host}`);
  if (domain) return domain;
  const prefix = sites.find((s) => !s.startsWith("sc-domain:") && hostOf(s) === host);
  return prefix ?? null;
}
