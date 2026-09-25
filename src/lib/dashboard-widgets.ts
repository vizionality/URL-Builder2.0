// The Dashboard's widget catalog and layout rules. A layout is an ordered list
// of widget ids, saved per user + GA4 property; the page renders widgets in
// that order and only asks GA4 for data behind the ones present.

export type WidgetCategory = "Summary" | "Traffic" | "Geography" | "Acquisition" | "Conversions";

// full = spans the row; third = one of three per row on wide screens;
// scorecard = all scorecards share one Summary row.
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
  // Extra GA4 widgets (not in the default layout; see lib/extra-widgets.ts).
  { id: "sc.bounceRate", title: "Bounce rate", description: "Share of sessions that weren't engaged.", category: "Summary", size: "scorecard" },
  { id: "sc.pagesPerSession", title: "Views per session", description: "Average page and screen views per session.", category: "Summary", size: "scorecard" },
  { id: "sc.engagedSessions", title: "Engaged sessions", description: "Sessions over 10s, with a key event, or 2+ views.", category: "Summary", size: "scorecard" },
  { id: "sc.eventCount", title: "Event count", description: "All events fired, with % change.", category: "Summary", size: "scorecard" },
  { id: "sc.keyEvents", title: "Key events", description: "All key events, with % change.", category: "Conversions", size: "scorecard" },
  { id: "device", title: "Device category", description: "Sessions by desktop, mobile and tablet.", category: "Traffic", size: "third" },
  { id: "newVsReturning", title: "New vs returning", description: "Users split into new and returning.", category: "Traffic", size: "third" },
  { id: "browser", title: "Browsers", description: "Top browsers by sessions.", category: "Traffic", size: "third" },
  { id: "countries", title: "Top Countries", description: "Top countries by sessions.", category: "Geography", size: "third" },
  { id: "cities", title: "Top Cities", description: "Top cities by sessions.", category: "Geography", size: "third" },
  { id: "hourOfDay", title: "Sessions by hour", description: "When visitors arrive, by hour of day.", category: "Traffic", size: "third" },
  { id: "pageTitles", title: "Top Pages", description: "Page titles by views, users and engagement time.", category: "Traffic", size: "full" },
  { id: "campaigns", title: "Campaigns", description: "Session campaigns by sessions, engagement and key events.", category: "Acquisition", size: "full" },
];

export const WIDGET_BY_ID = new Map(WIDGETS.map((w) => [w.id, w]));

// Today's dashboard, used until a user customizes theirs.
export const DEFAULT_LAYOUT: string[] = [
  "sc.views", "sc.totalUsers", "sc.newUsers", "sc.sessions", "sc.engagementRate",
  "sc.avgSessionDuration", "sc.generateLead",
  "monthly", "channel", "states", "geo", "sources", "pages", "conversions",
];

// Widgets served by /api/ga4/widgets rather than the overview/breakdowns routes.
export const EXTRA_WIDGET_IDS = [
  "sc.bounceRate", "sc.pagesPerSession", "sc.engagedSessions", "sc.eventCount", "sc.keyEvents",
  "device", "newVsReturning", "browser", "countries", "cities", "hourOfDay", "pageTitles", "campaigns",
];
export function extraParts(layout: string[]): string[] {
  return EXTRA_WIDGET_IDS.filter((id) => layout.includes(id));
}

export const MAX_LAYOUT = 60;

// ---- Widths ------------------------------------------------------------------
// Widgets sit on a 12-column row. Resizing snaps to 25 / 33 / 50 / 75 / 100%.
export const SPANS = [3, 4, 6, 9, 12] as const;
export type Span = (typeof SPANS)[number];

export function defaultSpan(id: string): Span {
  return WIDGET_BY_ID.get(id)?.size === "third" ? 4 : 12;
}

// Nearest allowed span to a fractional column count.
export function snapSpan(cols: number): Span {
  return SPANS.reduce((best, s) => (Math.abs(s - cols) < Math.abs(best - cols) ? s : best), SPANS[0] as Span);
}

// ---- Empty slots ---------------------------------------------------------------
// Shrinking a widget leaves an empty slot ("gap:<n>") beside it instead of
// pulling the next widget up. It shows as a dashed "drop a widget here" box;
// dropping a widget on it fills it, and it can be removed.
export const GAP_PREFIX = "gap:";
export const MAX_GAPS = 20;
export function isGap(id: string): boolean {
  return /^gap:[a-z0-9]{1,12}$/.test(id);
}
function newGapId(ids: string[]): string {
  let n = 1;
  while (ids.includes(`${GAP_PREFIX}${n}`)) n++;
  return `${GAP_PREFIX}${n}`;
}

// Saved layout entries are "id" or "id|span" (a width in 12ths, 1-12).
function splitEntry(entry: string): { id: string; span: number | null } {
  const [id, raw] = entry.split("|");
  const n = Number(raw);
  return { id, span: Number.isInteger(n) && n >= 1 && n <= 12 ? n : null };
}

// Keep known widget ids, in order, each once, with a valid width if one was
// given. Anything else (a removed widget, a tampered request) is dropped
// rather than failing the whole layout.
export function sanitizeLayout(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of input) {
    if (typeof entry !== "string") continue;
    const { id, span } = splitEntry(entry);
    if (seen.has(id)) continue;
    if (isGap(id)) {
      // An empty slot needs its width, and there's a cap on how many.
      if (!span || out.filter((e) => isGap(e.split("|")[0])).length >= MAX_GAPS) continue;
      seen.add(id);
      out.push(`${id}|${span}`);
      continue;
    }
    if (!WIDGET_BY_ID.has(id)) continue;
    seen.add(id);
    out.push(span && WIDGET_BY_ID.get(id)?.size !== "scorecard" ? `${id}|${span}` : id);
    if (out.length >= MAX_LAYOUT) break;
  }
  return out;
}

export type Spans = Record<string, number>;

// Saved entries -> widget ids in order plus any custom widths.
export function parseLayout(entries: string[]): { ids: string[]; spans: Spans } {
  const ids: string[] = [];
  const spans: Spans = {};
  for (const entry of sanitizeLayout(entries)) {
    const { id, span } = splitEntry(entry);
    ids.push(id);
    if (span && (isGap(id) || span !== defaultSpan(id))) spans[id] = span;
  }
  return { ids, spans };
}

export function serializeLayout(ids: string[], spans: Spans): string[] {
  return ids.map((id) =>
    spans[id] && (isGap(id) || spans[id] !== defaultSpan(id)) ? `${id}|${spans[id]}` : id
  );
}

export function spanOf(id: string, spans: Spans): number {
  return spans[id] ?? defaultSpan(id);
}

export type LayoutBlock =
  | { kind: "scorecards"; ids: string[] }
  | { kind: "widget"; id: string }
  | { kind: "gap"; id: string };

// All scorecards share one Summary row, placed where the first scorecard sits
// (so adding a scorecard anywhere joins the existing row instead of starting a
// new one at the bottom). Every other widget is its own block.
export function layoutBlocks(layout: string[]): LayoutBlock[] {
  const out: LayoutBlock[] = [];
  let summary: { kind: "scorecards"; ids: string[] } | null = null;
  for (const id of layout) {
    if (isGap(id)) {
      out.push({ kind: "gap", id });
      continue;
    }
    const def = WIDGET_BY_ID.get(id);
    if (!def) continue;
    if (def.size === "scorecard") {
      if (summary) summary.ids.push(id);
      else out.push((summary = { kind: "scorecards", ids: [id] }));
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
    if (EXTRA_WIDGET_IDS.includes(id)) continue;
    if (id.startsWith("sc.")) parts.add("summary");
    else if (["monthly", "channel", "states", "geo"].includes(id)) parts.add(id);
  }
  return [...parts].sort();
}
export function breakdownParts(layout: string[]): string[] {
  return ["sources", "pages", "conversions"].filter((p) => layout.includes(p));
}

// ---- Drag and drop -----------------------------------------------------------

// Drag ids: a widget on the dashboard is its own id; a catalog item in the
// sidebar is "new:<id>". Drop targets: another widget, the dashboard area, or
// the sidebar.
export const NEW_PREFIX = "new:";
export const DASHBOARD_DROP = "drop:dashboard";
export const SIDEBAR_DROP = "drop:sidebar";

// Resize a widget. Shrinking leaves an empty slot for the freed width right
// after it (merged into one already there), so nothing below moves up.
// Growing takes width back from a slot right after it first.
export function resizeWithGap(ids: string[], spans: Spans, id: string, span: number): { ids: string[]; spans: Spans } {
  const old = spanOf(id, spans);
  if (span === old || !ids.includes(id)) return { ids, spans };
  const next = [...ids];
  const nextSpans: Spans = { ...spans, [id]: span };
  const after = next[next.indexOf(id) + 1];
  if (span < old) {
    const freed = old - span;
    if (after && isGap(after)) {
      nextSpans[after] = Math.min(12, spanOf(after, spans) + freed);
    } else {
      const gap = newGapId(next);
      next.splice(next.indexOf(id) + 1, 0, gap);
      nextSpans[gap] = freed;
    }
  } else if (after && isGap(after)) {
    const left = spanOf(after, spans) - (span - old);
    if (left > 0) nextSpans[after] = left;
    else {
      next.splice(next.indexOf(after), 1);
      delete nextSpans[after];
    }
  }
  return { ids: next, spans: nextSpans };
}

export function removeGap(ids: string[], spans: Spans, gap: string): { ids: string[]; spans: Spans } {
  if (!ids.includes(gap)) return { ids, spans };
  const rest = { ...spans };
  delete rest[gap];
  return { ids: ids.filter((i) => i !== gap), spans: rest };
}

// Drop plus widths: a widget that isn't full width, dropped onto a full-width
// widget, sits beside it and both snap to 50%. (A full-width widget dropped on
// another is just a reorder.)
export function dropWithSpans(
  ids: string[],
  spans: Spans,
  active: string,
  over: string | null
): { ids: string[]; spans: Spans } {
  // A widget dropped on an empty slot fills it, taking the slot's width.
  if (over && isGap(over) && !isGap(active)) {
    const moved = active.startsWith(NEW_PREFIX) ? active.slice(NEW_PREFIX.length) : active;
    const def = WIDGET_BY_ID.get(moved);
    if (!def || def.size === "scorecard") return { ids, spans };
    if (active.startsWith(NEW_PREFIX) ? ids.includes(moved) : !ids.includes(moved)) return { ids, spans };
    const width = spanOf(over, spans);
    const next = ids.filter((i) => i !== moved);
    next[next.indexOf(over)] = moved;
    const nextSpans: Spans = { ...spans, [moved]: width };
    delete nextSpans[over];
    return { ids: next, spans: nextSpans };
  }
  const next = applyDrop(ids, active, over);
  if (next === ids || !over) return { ids, spans };
  const moved = active.startsWith(NEW_PREFIX) ? active.slice(NEW_PREFIX.length) : active;
  const isCard = (id: string) => WIDGET_BY_ID.get(id)?.size === "scorecard";
  if (next.includes(over) && next.includes(moved) && !isCard(over) && !isCard(moved) && !isGap(moved) && !isGap(over)) {
    const pairs = spanOf(over, spans) === 12 && (active.startsWith(NEW_PREFIX) || spanOf(moved, spans) !== 12);
    if (pairs) return { ids: next, spans: { ...spans, [over]: 6, [moved]: 6 } };
  }
  return { ids: next, spans };
}

// The layout after dropping `active` on `over`, or the same array if nothing changes.
export function applyDrop(layout: string[], active: string, over: string | null): string[] {
  if (!over) return layout;
  if (active.startsWith(NEW_PREFIX)) {
    const id = active.slice(NEW_PREFIX.length);
    if (!WIDGET_BY_ID.has(id) || layout.includes(id)) return layout;
    const at = layout.indexOf(over);
    if (at >= 0) return [...layout.slice(0, at), id, ...layout.slice(at)];
    if (over === DASHBOARD_DROP) return [...layout, id];
    return layout;
  }
  if (!layout.includes(active)) return layout;
  // Dragged back to the sidebar: remove it.
  if (over === SIDEBAR_DROP || over.startsWith(NEW_PREFIX)) return layout.filter((w) => w !== active);
  const from = layout.indexOf(active);
  const to = layout.indexOf(over);
  if (to < 0 || from === to) return layout;
  const next = [...layout];
  next.splice(from, 1);
  next.splice(to, 0, active);
  return next;
}
