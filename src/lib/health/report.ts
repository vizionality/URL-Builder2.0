import { parseGa4Date } from "./baseline";
import type {
  ChannelRow,
  EventRow,
  PageDayRow,
  PaidRow,
  SourceRow,
  TopPageRow,
  TrafficRow,
} from "./types";

// Pure adapters between the GA4 Data API runReport response shape and the plain
// arrays the checks consume. No fetching here — the route does I/O and hands
// these the already-parsed `rows`.
//
// NOTE on field names: dimensions/metrics used here reuse names already proven
// against a live property by this repo's existing /api/ga4/report route (date,
// sessionCampaignName, sessionSource, sessions, engagementRate) plus standard
// GA4 Data API names (eventName, eventCount, totalUsers, sessionMedium,
// sessionCampaignName, sessionDefaultChannelGroup, landingPage, totalRevenue).
// The genuinely version-dependent one — keyEvents vs. conversions — is probed
// at runtime by the route, and each report is fetched independently so an
// unknown name degrades one check rather than the whole run.

export type RawRow = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};

function dim(row: RawRow, i: number): string {
  return row.dimensionValues?.[i]?.value ?? "";
}
function met(row: RawRow, i: number): number {
  const v = Number(row.metricValues?.[i]?.value ?? "0");
  return Number.isFinite(v) ? v : 0;
}

// [date, eventName] x [eventCount]
export function toEventRows(rows: RawRow[]): EventRow[] {
  return rows.map((r) => ({
    date: parseGa4Date(dim(r, 0)),
    eventName: dim(r, 1),
    eventCount: met(r, 0),
  }));
}

// [date] x [sessions, totalUsers, <keyMetric>, totalRevenue?]
export function toTrafficRows(rows: RawRow[], hasRevenue: boolean): TrafficRow[] {
  return rows.map((r) => {
    const base: TrafficRow = {
      date: parseGa4Date(dim(r, 0)),
      sessions: met(r, 0),
      totalUsers: met(r, 1),
      keyEvents: met(r, 2),
    };
    if (hasRevenue) base.totalRevenue = met(r, 3);
    return base;
  });
}

// [sessionDefaultChannelGroup] x [sessions]
export function toChannelRows(rows: RawRow[]): ChannelRow[] {
  return rows.map((r) => ({ channelGroup: dim(r, 0), sessions: met(r, 0) }));
}

// [sessionMedium, sessionCampaignName] x [sessions]
export function toPaidRows(rows: RawRow[]): PaidRow[] {
  return rows.map((r) => ({
    medium: dim(r, 0),
    campaign: dim(r, 1),
    sessions: met(r, 0),
  }));
}

// [sessionSource] x [sessions]
export function toSourceRows(rows: RawRow[]): SourceRow[] {
  return rows.map((r) => ({ source: dim(r, 0), sessions: met(r, 0) }));
}

// [landingPage] x [sessions]
export function toTopPageRows(rows: RawRow[]): TopPageRow[] {
  return rows.map((r) => ({ page: dim(r, 0), sessions: met(r, 0) }));
}

// [date, landingPage] x [sessions, <keyMetric>]
export function toPageDayRows(rows: RawRow[]): PageDayRow[] {
  return rows.map((r) => ({
    date: parseGa4Date(dim(r, 0)),
    page: dim(r, 1),
    sessions: met(r, 0),
    keyEvents: met(r, 1),
  }));
}
