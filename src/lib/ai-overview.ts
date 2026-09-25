// Pure helpers for the AI Overview: shape GA4 + Search Console numbers into a
// compact digest for the model, and parse its JSON reply. Unit-tested.

export type Totals = Record<string, number>;
export type Row = { label: string; values: Record<string, number> };

export type Digest = {
  range: { startDate: string; endDate: string; previousStart: string; previousEnd: string };
  ga4: {
    totals: Totals;
    previous: Totals;
    channels: Row[];
    sources: Row[];
    landingPages: Row[];
  } | null;
  gsc: {
    site: string;
    totals: Totals;
    previous: Totals;
    queries: Row[];
    pages: Row[];
  } | null;
};

export type Overview = {
  headline: string;
  summary: string;
  wins: string[];
  concerns: string[];
  actions: string[];
};

// Two decimals is plenty for the model and keeps the prompt small.
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function roundValues(values: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, round(v)]));
}

// Percent change per metric, null when there's no prior value.
export function changes(cur: Totals, prev: Totals): Record<string, number | null> {
  return Object.fromEntries(
    Object.keys(cur).map((k) => [k, prev[k] ? round(((cur[k] - prev[k]) / prev[k]) * 100) : null])
  );
}

export function digestText(d: Digest): string {
  const out: Record<string, unknown> = { range: d.range };
  if (d.ga4) {
    out.ga4 = {
      totals: roundValues(d.ga4.totals),
      pctChangeVsPrevious: changes(d.ga4.totals, d.ga4.previous),
      channels: d.ga4.channels.map((r) => ({ ...r, values: roundValues(r.values) })),
      topSourceMedium: d.ga4.sources.map((r) => ({ ...r, values: roundValues(r.values) })),
      topLandingPages: d.ga4.landingPages.map((r) => ({ ...r, values: roundValues(r.values) })),
    };
  }
  if (d.gsc) {
    out.searchConsole = {
      site: d.gsc.site,
      totals: roundValues(d.gsc.totals),
      pctChangeVsPrevious: changes(d.gsc.totals, d.gsc.previous),
      topQueries: d.gsc.queries.map((r) => ({ ...r, values: roundValues(r.values) })),
      topPages: d.gsc.pages.map((r) => ({ ...r, values: roundValues(r.values) })),
    };
  }
  return JSON.stringify(out);
}

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, 6) : [];

// Parse the model's reply: the first {...} block, with every field checked.
export function parseOverview(text: string): Overview | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const o = JSON.parse(text.slice(start, end + 1));
    if (typeof o.headline !== "string" || typeof o.summary !== "string") return null;
    return {
      headline: o.headline.trim(),
      summary: o.summary.trim(),
      wins: strList(o.wins),
      concerns: strList(o.concerns),
      actions: strList(o.actions),
    };
  } catch {
    return null;
  }
}
