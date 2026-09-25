// The dashboard's page filters (repeated query params; none means all) and how
// they become a GA4 dimensionFilter. medium/campaign/source/page come from the
// dropdowns; channel/landing/region are set by clicking a chart (cross-filter).

type Expr = Record<string, unknown>;

export type PageFilters = {
  medium: string[];
  campaign: string[];
  source: string[];
  page: string[];
  channel: string[];
  landing: string[];
  region: string[];
  // AI Overview tab: only sessions referred by AI assistants.
  ai: boolean;
};

// Session sources of AI assistants and answer engines (matched anywhere in the
// source, case-insensitive), e.g. chatgpt.com, perplexity.ai, gemini.google.com.
export const AI_SOURCE_PATTERNS = [
  "chatgpt", "openai", "perplexity", "gemini\\.google", "bard\\.google", "copilot", "claude\\.ai",
  "anthropic", "deepseek", "meta\\.ai", "grok", "x\\.ai", "mistral", "you\\.com", "phind", "poe\\.com",
];
export const AI_SOURCE_REGEX = `.*(${AI_SOURCE_PATTERNS.join("|")}).*`;
export const aiSourceFilter = (): Expr => ({
  filter: { fieldName: "sessionSource", stringFilter: { value: AI_SOURCE_REGEX, matchType: "FULL_REGEXP", caseSensitive: false } },
});

const FIELDS: [keyof PageFilters, string][] = [
  ["medium", "sessionMedium"],
  ["campaign", "sessionCampaignName"],
  ["source", "sessionSource"],
  ["page", "pagePath"],
  ["channel", "sessionDefaultChannelGroup"],
  ["landing", "landingPage"],
  ["region", "region"],
];

export function parsePageFilters(params: URLSearchParams): PageFilters {
  const get = (k: string) => params.getAll(k).filter(Boolean);
  const f = Object.fromEntries(FIELDS.map(([key]) => [key, get(key)])) as Omit<PageFilters, "ai">;
  return { ...f, ai: params.get("ai") === "1" };
}

export const exactFilter = (fieldName: string, value: string): Expr => ({
  filter: { fieldName, stringFilter: { value, matchType: "EXACT" } },
});

// AND of the active page filters plus any extra expressions, or {}.
export function pageFilterExpr(f: PageFilters, extra: Expr[] = []) {
  const expressions: Expr[] = [];
  if (f.ai) expressions.push(aiSourceFilter());
  for (const [key, fieldName] of FIELDS) {
    if ((f[key] as string[]).length) expressions.push({ filter: { fieldName, inListFilter: { values: f[key] as string[] } } });
  }
  expressions.push(...extra);
  if (expressions.length === 0) return {};
  if (expressions.length === 1) return { dimensionFilter: expressions[0] };
  return { dimensionFilter: { andGroup: { expressions } } };
}
