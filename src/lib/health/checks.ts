import { median, pctChange } from "./baseline";
import type {
  Alert,
  ChannelRow,
  EventRow,
  HealthConfig,
  PageDayRow,
  PaidRow,
  SourceRow,
  TopPageRow,
  TrafficRow,
} from "./types";

// The four check families. Each takes already-fetched data as plain
// arrays/objects plus the config, and returns alerts. Nothing here fetches.

const EMPTY_CAMPAIGN = new Set(["", "(not set)", "(direct)", "(organic)"]);
const PAID_MEDIUM_RE = /^(cpc|ppc|paid.*)$/i;

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---- Check 1: tracking breakage --------------------------------------------
export function checkTracking(
  rows: EventRow[],
  targetIso: string,
  baseDates: string[],
  config: HealthConfig
): Alert[] {
  const alerts: Alert[] = [];

  // event -> date -> count
  const byEvent = new Map<string, Map<string, number>>();
  for (const r of rows) {
    let m = byEvent.get(r.eventName);
    if (!m) byEvent.set(r.eventName, (m = new Map()));
    m.set(r.date, (m.get(r.date) ?? 0) + r.eventCount);
  }

  // Named key events that returned no rows anywhere in the window: renamed/removed.
  for (const name of config.keyEvents) {
    if (!byEvent.has(name)) {
      alerts.push({
        check: "tracking",
        severity: "HIGH",
        subject: name,
        detail: `Configured key event "${name}" returned no rows anywhere in the baseline window — it was likely renamed or removed.`,
      });
    }
  }

  for (const [name, series] of byEvent) {
    const baseline = median(baseDates.map((d) => series.get(d) ?? 0));
    if (!Number.isFinite(baseline) || baseline < config.minEventVolume) {
      continue; // sparse event below the volume floor — ignore
    }
    const observed = series.get(targetIso) ?? 0;

    if (observed === 0) {
      alerts.push({
        check: "tracking",
        severity: "HIGH",
        subject: name,
        detail: `"${name}" stopped firing (0 vs. baseline ${round(baseline)}).`,
        observed,
        baseline,
        changePct: -100,
      });
      continue;
    }

    const change = pctChange(observed, baseline);
    if (change <= -config.dropPctHigh) {
      alerts.push(mkChange("tracking", "HIGH", name, `dropped`, observed, baseline, change));
    } else if (change <= -config.dropPctMedium) {
      alerts.push(mkChange("tracking", "MEDIUM", name, `dropped`, observed, baseline, change));
    } else if (change >= config.spikePct) {
      alerts.push({
        check: "tracking",
        severity: "MEDIUM",
        subject: name,
        detail: `"${name}" spiked ${round(change)}% (${round(observed)} vs. baseline ${round(baseline)}) — possible duplicate tag or a second GA4 configuration double-counting.`,
        observed,
        baseline,
        changePct: change,
      });
    }
  }

  return alerts;
}

// ---- Check 2: traffic and revenue ------------------------------------------
export function checkTraffic(
  rows: TrafficRow[],
  targetIso: string,
  baseDates: string[],
  config: HealthConfig
): Alert[] {
  const byDate = new Map<string, TrafficRow>();
  for (const r of rows) byDate.set(r.date, r);

  const baseSessions = median(baseDates.map((d) => byDate.get(d)?.sessions ?? 0));
  if (!Number.isFinite(baseSessions) || baseSessions < config.minSessionsTraffic) {
    return []; // too little traffic to reason about
  }

  const target = byDate.get(targetIso);
  if (!target) return [];

  const alerts: Alert[] = [];
  const metrics: { key: keyof TrafficRow; label: string; critical: boolean }[] = [
    { key: "sessions", label: "Sessions", critical: false },
    { key: "totalUsers", label: "Total users", critical: false },
    { key: "keyEvents", label: "Key events", critical: true },
    { key: "totalRevenue", label: "Revenue", critical: true },
  ];

  for (const { key, label, critical } of metrics) {
    const observed = target[key];
    if (observed === undefined) continue; // e.g. no revenue on this property
    const baseline = median(
      baseDates.map((d) => {
        const v = byDate.get(d)?.[key];
        return typeof v === "number" ? v : NaN;
      })
    );
    if (!Number.isFinite(baseline) || baseline === 0) continue;

    const change = pctChange(observed as number, baseline);
    if (Math.abs(change) < config.anomalyPct) continue;

    const isDrop = change < 0;
    const severity = critical && isDrop ? "HIGH" : "MEDIUM";
    alerts.push({
      check: "traffic",
      severity,
      subject: label,
      detail: `${label} ${isDrop ? "fell" : "rose"} ${round(Math.abs(change))}% (${round(observed as number)} vs. baseline ${round(baseline)}).`,
      observed: observed as number,
      baseline,
      changePct: change,
    });
  }

  return alerts;
}

// ---- Check 3: data quality drift -------------------------------------------
export function checkQuality(
  channel: ChannelRow[],
  paid: PaidRow[],
  source: SourceRow[],
  config: HealthConfig
): Alert[] {
  const alerts: Alert[] = [];

  // Unassigned share of sessions.
  const totalCh = channel.reduce((s, r) => s + r.sessions, 0);
  const unassigned = channel
    .filter((r) => r.channelGroup === "Unassigned")
    .reduce((s, r) => s + r.sessions, 0);
  if (totalCh > 0) {
    const share = unassigned / totalCh;
    if (share > config.unassignedShareMax) {
      alerts.push({
        check: "quality",
        severity: "MEDIUM",
        subject: "Unassigned traffic",
        detail: `${round(share * 100)}% of sessions are Unassigned (limit ${round(config.unassignedShareMax * 100)}%) — a tagging or channel-grouping problem.`,
        observed: round(share * 100),
      });
    }
  }

  // Paid sessions with no campaign name.
  const paidRows = paid.filter((r) => PAID_MEDIUM_RE.test(r.medium));
  const totalPaid = paidRows.reduce((s, r) => s + r.sessions, 0);
  if (totalPaid > 0) {
    const noCampaign = paidRows
      .filter((r) => EMPTY_CAMPAIGN.has(r.campaign))
      .reduce((s, r) => s + r.sessions, 0);
    const share = noCampaign / totalPaid;
    if (share > config.paidNoCampaignShareMax) {
      alerts.push({
        check: "quality",
        severity: "MEDIUM",
        subject: "Paid traffic missing campaign",
        detail: `${round(share * 100)}% of paid sessions have no campaign name (limit ${round(config.paidNoCampaignShareMax * 100)}%) — check auto-tagging / UTMs.`,
        observed: round(share * 100),
      });
    }
  }

  // Self referrals: sessions whose source contains the configured domain.
  if (config.siteDomain) {
    const self = source
      .filter((r) => r.source.includes(config.siteDomain))
      .reduce((s, r) => s + r.sessions, 0);
    if (self > 0) {
      alerts.push({
        check: "quality",
        severity: "MEDIUM",
        subject: "Self referrals",
        detail: `${round(self)} sessions are referred by your own domain "${config.siteDomain}" — a cross-domain or referral-exclusion problem.`,
        observed: self,
      });
    }
  }

  return alerts;
}

// ---- Check 4: landing pages ------------------------------------------------
export function checkLandingPages(
  topPages: TopPageRow[],
  series: PageDayRow[],
  targetIso: string,
  baseDates: string[],
  config: HealthConfig
): Alert[] {
  // page -> date -> {sessions, keyEvents}
  const byPage = new Map<string, Map<string, { sessions: number; keyEvents: number }>>();
  for (const r of series) {
    let m = byPage.get(r.page);
    if (!m) byPage.set(r.page, (m = new Map()));
    const cur = m.get(r.date) ?? { sessions: 0, keyEvents: 0 };
    cur.sessions += r.sessions;
    cur.keyEvents += r.keyEvents;
    m.set(r.date, cur);
  }

  const alerts: Alert[] = [];
  for (const top of topPages) {
    if (top.sessions < config.minSessionsPage) continue; // low-volume page — ignore

    const days = byPage.get(top.page);
    if (!days) continue;

    const baselineCrs = baseDates
      .map((d) => days.get(d))
      .filter((v): v is { sessions: number; keyEvents: number } => !!v && v.sessions > 0)
      .map((v) => v.keyEvents / v.sessions);
    const baselineCr = median(baselineCrs);
    if (!Number.isFinite(baselineCr) || baselineCr === 0) continue; // no baseline to compare

    const targetDay = days.get(targetIso);
    const observedCr =
      targetDay && targetDay.sessions > 0 ? targetDay.keyEvents / targetDay.sessions : 0;

    if (observedCr === 0) {
      alerts.push({
        check: "landing",
        severity: "HIGH",
        subject: top.page,
        detail: `Conversion rate on ${top.page} dropped to 0% (baseline ${round(baselineCr * 100)}%).`,
        observed: 0,
        baseline: round(baselineCr * 100),
        changePct: -100,
      });
      continue;
    }

    const change = pctChange(observedCr, baselineCr);
    if (change <= -config.dropPctHigh || change <= -config.dropPctMedium) {
      alerts.push({
        check: "landing",
        severity: change <= -config.dropPctHigh ? "HIGH" : "MEDIUM",
        subject: top.page,
        detail: `Conversion rate on ${top.page} fell ${round(Math.abs(change))}% (${round(observedCr * 100)}% vs. baseline ${round(baselineCr * 100)}%).`,
        observed: round(observedCr * 100),
        baseline: round(baselineCr * 100),
        changePct: change,
      });
    }
  }

  return alerts;
}

function mkChange(
  check: Alert["check"],
  severity: Alert["severity"],
  subject: string,
  verb: string,
  observed: number,
  baseline: number,
  change: number
): Alert {
  return {
    check,
    severity,
    subject,
    detail: `"${subject}" ${verb} ${round(Math.abs(change))}% (${round(observed)} vs. baseline ${round(baseline)}).`,
    observed,
    baseline,
    changePct: change,
  };
}
