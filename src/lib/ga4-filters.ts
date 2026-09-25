// The dashboard's page filters (multi-select, repeated query params; none
// means all) and how they become a GA4 dimensionFilter.

type Expr = Record<string, unknown>;

export type PageFilters = { medium: string[]; campaign: string[]; source: string[]; page: string[] };

const FIELDS: [keyof PageFilters, string][] = [
  ["medium", "sessionMedium"],
  ["campaign", "sessionCampaignName"],
  ["source", "sessionSource"],
  ["page", "pagePath"],
];

export function parsePageFilters(params: URLSearchParams): PageFilters {
  const get = (k: string) => params.getAll(k).filter(Boolean);
  return { medium: get("medium"), campaign: get("campaign"), source: get("source"), page: get("page") };
}

export const exactFilter = (fieldName: string, value: string): Expr => ({
  filter: { fieldName, stringFilter: { value, matchType: "EXACT" } },
});

// AND of the active page filters plus any extra expressions, or {}.
export function pageFilterExpr(f: PageFilters, extra: Expr[] = []) {
  const expressions: Expr[] = [];
  for (const [key, fieldName] of FIELDS) {
    if (f[key].length) expressions.push({ filter: { fieldName, inListFilter: { values: f[key] } } });
  }
  expressions.push(...extra);
  if (expressions.length === 0) return {};
  if (expressions.length === 1) return { dimensionFilter: expressions[0] };
  return { dimensionFilter: { andGroup: { expressions } } };
}
