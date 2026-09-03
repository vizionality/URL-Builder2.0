import type { Alert, CheckFamily, Severity } from "./types";

// Alert shaping and severity ranking. HIGH before MEDIUM, then a stable order
// by check family and subject so the dashboard rendering is deterministic.

const SEVERITY_RANK: Record<Severity, number> = { HIGH: 0, MEDIUM: 1 };
const CHECK_RANK: Record<CheckFamily, number> = {
  tracking: 0,
  traffic: 1,
  landing: 2,
  quality: 3,
};

export function severityRank(sev: Severity): number {
  return SEVERITY_RANK[sev];
}

/** Sort alerts most-severe first, then by check family, then subject. */
export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) ||
      CHECK_RANK[a.check] - CHECK_RANK[b.check] ||
      a.subject.localeCompare(b.subject)
  );
}

export type AlertSummary = { total: number; high: number; medium: number };

export function summarize(alerts: Alert[]): AlertSummary {
  return {
    total: alerts.length,
    high: alerts.filter((a) => a.severity === "HIGH").length,
    medium: alerts.filter((a) => a.severity === "MEDIUM").length,
  };
}
