// GA4 Health Monitor — shared types for the pure check layer.
//
// These functions never fetch anything. They take already-fetched GA4 data as
// plain arrays/objects and return alert objects, which is what makes them
// unit-testable without any GA4 / network / framework globals.

export type Severity = "HIGH" | "MEDIUM";

export type CheckFamily = "tracking" | "traffic" | "quality" | "landing";

export type Alert = {
  check: CheckFamily;
  severity: Severity;
  /** Short label, e.g. the event name, metric, or page path. */
  subject: string;
  /** Human-readable description of what was detected. */
  detail: string;
  observed?: number;
  baseline?: number;
  /** Signed percent change of observed vs. baseline. */
  changePct?: number;
};

export type HealthConfig = {
  propertyId: string;
  siteDomain: string;
  keyEvents: string[];
  lagDays: number;
  baselineWeeks: number;
  dropPctHigh: number;
  dropPctMedium: number;
  spikePct: number;
  anomalyPct: number;
  minEventVolume: number;
  minSessionsTraffic: number;
  /** 0..1 share of Unassigned sessions before flagging. */
  unassignedShareMax: number;
  /** 0..1 share of paid sessions with no campaign before flagging. */
  paidNoCampaignShareMax: number;
  minSessionsPage: number;
  topPages: number;
};

// ---- Input shapes the checks consume (already fetched + flattened) ----------

export type EventRow = { date: string; eventName: string; eventCount: number };

export type TrafficRow = {
  date: string;
  sessions: number;
  totalUsers: number;
  keyEvents: number;
  /** Absent when the property has no ecommerce / revenue. */
  totalRevenue?: number;
};

export type ChannelRow = { channelGroup: string; sessions: number };
export type PaidRow = { medium: string; campaign: string; sessions: number };
export type SourceRow = { source: string; sessions: number };

export type TopPageRow = { page: string; sessions: number };
export type PageDayRow = {
  date: string;
  page: string;
  sessions: number;
  keyEvents: number;
};
