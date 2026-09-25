// Pure helpers for Search Console (Search Analytics) data. Unit-tested.

export type GscRow = { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number };
export type GscTotals = { clicks: number; impressions: number; ctr: number; position: number };
export type GscItem = GscTotals & { key: string };
export type GscDay = GscTotals & { date: string };

export const EMPTY_TOTALS: GscTotals = { clicks: 0, impressions: 0, ctr: 0, position: 0 };

// A report with no dimensions returns one row holding the totals.
export function totalsOf(rows: GscRow[] | undefined): GscTotals {
  const r = rows?.[0];
  if (!r) return EMPTY_TOTALS;
  return { clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position };
}

export function itemsOf(rows: GscRow[] | undefined): GscItem[] {
  return (rows ?? []).map((r) => ({
    key: r.keys?.[0] ?? "",
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));
}

// Daily rows for every day in the range; days Search Console has no row for are zero.
export function dailySeries(rows: GscRow[] | undefined, startIso: string, endIso: string): GscDay[] {
  const byDate = new Map((rows ?? []).map((r) => [r.keys?.[0] ?? "", r]));
  const out: GscDay[] = [];
  const d = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  while (d <= end) {
    const iso = d.toISOString().slice(0, 10);
    const r = byDate.get(iso);
    out.push(r ? { date: iso, clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position } : { date: iso, ...EMPTY_TOTALS });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// A readable name for a Search Console property URL.
export function siteLabel(siteUrl: string): string {
  if (siteUrl.startsWith("sc-domain:")) return `${siteUrl.slice(10)} (domain)`;
  return siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

// Short path for a page URL within the site, for tables.
export function pagePath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return url;
  }
}
