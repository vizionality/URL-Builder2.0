// The Dashboard's widget catalog and layout rules. A layout is an ordered list
// of widget ids, saved per user + GA4 property; the page renders widgets in
// that order and only asks GA4 for data behind the ones present.

export type WidgetCategory = "Summary" | "Traffic" | "Geography" | "Acquisition" | "Conversions";

// full = spans the row; third = one of three per row on wide screens;
// scorecard = consecutive scorecards group into one Summary row.
export type WidgetSize = "full" | "third" | "scorecard";

export type WidgetDef = {
  id: string;
  title: string;
  description: string;
  category: WidgetCategory;
  size: WidgetSize;
};

export const WIDGETS: WidgetDef[] = [
  { id: "sc.views", title: "Views", description: "Page and screen views, with % change.", category: "Summary", size: "scorecard" },
  { id: "sc.totalUsers", title: "Total users", description: "Unique users, with % change.", category: "Summary", size: "scorecard" },
  { id: "sc.newUsers", title: "New users", description: "First-time users, with % change.", category: "Summary", size: "scorecard" },
  { id: "sc.sessions", title: "Sessions", description: "Sessions started, with % change.", category: "Summary", size: "scorecard" },
  { id: "sc.engagementRate", title: "Engagement rate", description: "Share of sessions that were engaged.", category: "Summary", size: "scorecard" },
  { id: "sc.avgSessionDuration", title: "Avg session duration", description: "Average length of a session.", category: "Summary", size: "scorecard" },
  { id: "sc.generateLead", title: "Generate Lead", description: "generate_lead events, with % change.", category: "Summary", size: "scorecard" },
  { id: "monthly", title: "Monthly Overview", description: "This year vs last year by month, metric switchable.", category: "Traffic", size: "full" },
  { id: "channel", title: "Channel Group", description: "Pie of a metric by default channel group.", category: "Acquisition", size: "third" },
  { id: "states", title: "Top States", description: "Top 8 regions by a chosen metric.", category: "Geography", size: "third" },
  { id: "geo", title: "Geo Map", description: "US map by state, zooms into a city heat map.", category: "Geography", size: "third" },
  { id: "sources", title: "Top Traffic Sources", description: "Source / medium table with a trend.", category: "Acquisition", size: "full" },
  { id: "pages", title: "Landing Pages", description: "Landing page sessions and engagement, with a trend.", category: "Traffic", size: "full" },
  { id: "conversions", title: "Conversions", description: "Key events with % change and a trend.", category: "Conversions", size: "full" },
];

export const WIDGET_BY_ID = new Map(WIDGETS.map((w) => [w.id, w]));

// Today's dashboard, used until a user customizes theirs.
export const DEFAULT_LAYOUT: string[] = WIDGETS.map((w) => w.id);

export const MAX_LAYOUT = 60;

// Keep known widget ids, in order, each once. Anything else (a removed widget,
// a tampered request) is dropped rather than failing the whole layout.
export function sanitizeLayout(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of input) {
    if (typeof id !== "string" || !WIDGET_BY_ID.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_LAYOUT) break;
  }
  return out;
}

export type LayoutBlock =
  | { kind: "scorecards"; ids: string[] }
  | { kind: "widget"; id: string };

// Group consecutive scorecards into one row; every other widget is its own block.
export function layoutBlocks(layout: string[]): LayoutBlock[] {
  const out: LayoutBlock[] = [];
  for (const id of layout) {
    const def = WIDGET_BY_ID.get(id);
    if (!def) continue;
    const last = out[out.length - 1];
    if (def.size === "scorecard") {
      if (last?.kind === "scorecards") last.ids.push(id);
      else out.push({ kind: "scorecards", ids: [id] });
    } else {
      out.push({ kind: "widget", id });
    }
  }
  return out;
}

// Which server sections a layout needs, so the page skips the rest.
export function overviewParts(layout: string[]): string[] {
  const parts = new Set<string>();
  for (const id of layout) {
    if (id.startsWith("sc.")) parts.add("summary");
    else if (["monthly", "channel", "states", "geo"].includes(id)) parts.add(id);
  }
  return [...parts].sort();
}
export function breakdownParts(layout: string[]): string[] {
  return ["sources", "pages", "conversions"].filter((p) => layout.includes(p));
}
