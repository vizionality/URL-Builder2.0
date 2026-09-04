// Turn raw stored rows into an attribution report. Pure and deterministic, so
// the whole thing is unit-testable without a database. Steps: resolve each
// visitor to an effective identity (merging linked devices), build the ordered
// touch path leading up to each conversion, assign credit under the chosen
// model, and aggregate credit by channel plus supporting funnel views.

import { channelOf, type Channel } from "./channels";
import { creditFor, type AttributionModel } from "./models";

export type EngineTouch = {
  visitorId: string;
  occurredAt: string;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  clickIds: Record<string, string>;
  referrer: string | null;
};

export type EngineConversion = {
  visitorId: string;
  occurredAt: string;
  value: number | null;
};

export type IdentityLink = { visitorId: string; identityKey: string };

export type Path = {
  channels: Channel[];
  timesMs: number[];
  convTimeMs: number;
  value: number;
};

export type ChannelCredit = {
  channel: Channel;
  conversions: number; // summed fractional credit
  value: number; // credit-weighted conversion value
};

export type AttributionReport = {
  totalConversions: number;
  totalValue: number;
  uniqueVisitors: number;
  byChannel: ChannelCredit[];
  topPaths: { path: Channel[]; count: number }[];
  avgTouchesPerConversion: number;
  avgDaysToConvert: number | null;
  empty: null | "no-touches" | "no-conversions";
};

const DAY_MS = 86_400_000;

function ms(iso: string): number {
  return Date.parse(iso);
}

// Map a visitor to its effective identity (an identity key merges devices).
function identityMap(links: IdentityLink[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const l of links) m.set(l.visitorId, l.identityKey);
  return m;
}

export type BuildOptions = { lookbackDays?: number };

export function buildPaths(
  touches: EngineTouch[],
  conversions: EngineConversion[],
  links: IdentityLink[],
  opts: BuildOptions = {}
): Path[] {
  const lookbackMs = (opts.lookbackDays ?? 90) * DAY_MS;
  const idOf = identityMap(links);
  const effId = (visitorId: string) => idOf.get(visitorId) ?? visitorId;

  // Group touches by effective identity, sorted oldest first.
  const byId = new Map<string, EngineTouch[]>();
  for (const t of touches) {
    const key = effId(t.visitorId);
    const arr = byId.get(key);
    if (arr) arr.push(t);
    else byId.set(key, [t]);
  }
  for (const arr of byId.values()) arr.sort((a, b) => ms(a.occurredAt) - ms(b.occurredAt));

  const paths: Path[] = [];
  for (const conv of conversions) {
    const convMs = ms(conv.occurredAt);
    const arr = byId.get(effId(conv.visitorId)) ?? [];
    const window = arr.filter((t) => {
      const tMs = ms(t.occurredAt);
      return tMs <= convMs && tMs >= convMs - lookbackMs;
    });
    // A conversion with no preceding touch is credited to Direct.
    const channels: Channel[] = window.length
      ? window.map((t) => channelOf(t))
      : ["Direct"];
    const timesMs = window.length ? window.map((t) => ms(t.occurredAt)) : [convMs];
    paths.push({ channels, timesMs, convTimeMs: convMs, value: conv.value ?? 0 });
  }
  return paths;
}

export function attribute(
  paths: Path[],
  model: AttributionModel,
  halfLifeDays = 7
): ChannelCredit[] {
  const acc = new Map<Channel, { conversions: number; value: number }>();
  for (const p of paths) {
    const credit = creditFor(model, p.timesMs, p.convTimeMs, halfLifeDays);
    for (let i = 0; i < p.channels.length; i++) {
      const ch = p.channels[i];
      const c = credit[i] ?? 0;
      const cur = acc.get(ch) ?? { conversions: 0, value: 0 };
      cur.conversions += c;
      cur.value += c * p.value;
      acc.set(ch, cur);
    }
  }
  return [...acc.entries()]
    .map(([channel, v]) => ({ channel, conversions: v.conversions, value: v.value }))
    .sort((a, b) => b.conversions - a.conversions);
}

function topPaths(paths: Path[], limit = 8): { path: Channel[]; count: number }[] {
  const counts = new Map<string, { path: Channel[]; count: number }>();
  for (const p of paths) {
    const key = p.channels.join(" > ");
    const cur = counts.get(key);
    if (cur) cur.count += 1;
    else counts.set(key, { path: p.channels, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export function runReport(
  touches: EngineTouch[],
  conversions: EngineConversion[],
  links: IdentityLink[],
  model: AttributionModel,
  opts: { lookbackDays?: number; halfLifeDays?: number } = {}
): AttributionReport {
  const uniqueVisitors = new Set(touches.map((t) => t.visitorId)).size;

  if (touches.length === 0) {
    return emptyReport(uniqueVisitors, "no-touches");
  }
  if (conversions.length === 0) {
    return emptyReport(uniqueVisitors, "no-conversions");
  }

  const paths = buildPaths(touches, conversions, links, opts);
  const byChannel = attribute(paths, model, opts.halfLifeDays ?? 7);

  const totalConversions = paths.length;
  const totalValue = paths.reduce((s, p) => s + p.value, 0);
  const totalTouches = paths.reduce((s, p) => s + p.channels.length, 0);
  const daysToConvert = paths.map(
    (p) => (p.convTimeMs - p.timesMs[0]) / DAY_MS
  );
  const avgDaysToConvert =
    daysToConvert.length
      ? daysToConvert.reduce((s, d) => s + d, 0) / daysToConvert.length
      : null;

  return {
    totalConversions,
    totalValue,
    uniqueVisitors,
    byChannel,
    topPaths: topPaths(paths),
    avgTouchesPerConversion: totalTouches / paths.length,
    avgDaysToConvert,
    empty: null,
  };
}

function emptyReport(
  uniqueVisitors: number,
  empty: "no-touches" | "no-conversions"
): AttributionReport {
  return {
    totalConversions: 0,
    totalValue: 0,
    uniqueVisitors,
    byChannel: [],
    topPaths: [],
    avgTouchesPerConversion: 0,
    avgDaysToConvert: null,
    empty,
  };
}
