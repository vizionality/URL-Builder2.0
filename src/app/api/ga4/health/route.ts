import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { parseConfig } from "@/lib/health/config";
import {
  baselineDates,
  targetDate,
  toGa4Date,
  windowStart,
} from "@/lib/health/baseline";
import {
  checkLandingPages,
  checkQuality,
  checkTracking,
  checkTraffic,
} from "@/lib/health/checks";
import { sortAlerts, summarize } from "@/lib/health/format";
import {
  toChannelRows,
  toEventRows,
  toPageDayRows,
  toPaidRows,
  toSourceRows,
  toTopPageRows,
  toTrafficRows,
  type RawRow,
} from "@/lib/health/report";
import type { Alert } from "@/lib/health/types";

const DATA_API = "https://analyticsdata.googleapis.com/v1beta";

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function runReport(
  propertyId: string,
  token: string,
  body: unknown
): Promise<RawRow[]> {
  const res = await fetch(`${DATA_API}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GA4 runReport ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.rows ?? []) as RawRow[];
}

// GA4 renamed `conversions` to `keyEvents`. Probe once and use whichever the
// property accepts, falling back to conversions.
async function detectKeyMetric(propertyId: string, token: string): Promise<string> {
  for (const name of ["keyEvents", "conversions"]) {
    try {
      const res = await fetch(`${DATA_API}/properties/${propertyId}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "yesterday" }],
          metrics: [{ name }],
        }),
      });
      if (res.ok) return name;
    } catch {
      // try next
    }
  }
  return "keyEvents";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const conn = await getGa4Connection(user.id);
  if (!conn) {
    return NextResponse.json(
      { error: "Google Analytics is not connected." },
      { status: 501 }
    );
  }
  if (!conn.property_id) {
    return NextResponse.json({ error: "No GA4 property selected." }, { status: 400 });
  }

  let token: string;
  try {
    token = await getAccessToken(conn.refresh_token);
  } catch (err) {
    console.error("GA4 token refresh failed:", err);
    return NextResponse.json(
      { error: "Google auth expired. Reconnect Google Analytics." },
      { status: 401 }
    );
  }

  // Config: property from the connection; other thresholds use documented
  // defaults. site_domain is left blank for now (self-referral check no-ops
  // until a config surface exists).
  const config = parseConfig({ property_id: conn.property_id });
  const target = targetDate(todayUtcIso(), config.lagDays);
  const baseDates = baselineDates(target, config.baselineWeeks);
  const start = toGa4Date(windowStart(target, config.baselineWeeks));
  const end = toGa4Date(target);
  const windowRange = [{ startDate: start, endDate: end }];
  const targetRange = [{ startDate: end, endDate: end }];

  const propertyId = conn.property_id;
  const keyMetric = await detectKeyMetric(propertyId, token);
  const notes: string[] = [];
  const alerts: Alert[] = [];

  // Check 1: tracking breakage — [date, eventName] x [eventCount]
  try {
    const rows = await runReport(propertyId, token, {
      dateRanges: windowRange,
      dimensions: [{ name: "date" }, { name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      limit: 100000,
    });
    alerts.push(...checkTracking(toEventRows(rows), target, baseDates, config));
  } catch (err) {
    console.error("health: tracking report failed:", err);
    notes.push("Tracking check skipped (report failed).");
  }

  // Check 2: traffic & revenue — [date] x [sessions, totalUsers, key, revenue?]
  try {
    let hasRevenue = true;
    let rows: RawRow[];
    const metrics = [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: keyMetric },
      { name: "totalRevenue" },
    ];
    try {
      rows = await runReport(propertyId, token, {
        dateRanges: windowRange,
        dimensions: [{ name: "date" }],
        metrics,
      });
    } catch {
      // Property without ecommerce: retry without totalRevenue.
      hasRevenue = false;
      rows = await runReport(propertyId, token, {
        dateRanges: windowRange,
        dimensions: [{ name: "date" }],
        metrics: metrics.slice(0, 3),
      });
    }
    alerts.push(...checkTraffic(toTrafficRows(rows, hasRevenue), target, baseDates, config));
  } catch (err) {
    console.error("health: traffic report failed:", err);
    notes.push("Traffic check skipped (report failed).");
  }

  // Check 3: data quality — three target-day reports.
  try {
    const [channel, paid, source] = await Promise.all([
      runReport(propertyId, token, {
        dateRanges: targetRange,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
      }),
      runReport(propertyId, token, {
        dateRanges: targetRange,
        dimensions: [{ name: "sessionMedium" }, { name: "sessionCampaignName" }],
        metrics: [{ name: "sessions" }],
      }),
      runReport(propertyId, token, {
        dateRanges: targetRange,
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "sessions" }],
      }),
    ]);
    alerts.push(
      ...checkQuality(
        toChannelRows(channel),
        toPaidRows(paid),
        toSourceRows(source),
        config
      )
    );
  } catch (err) {
    console.error("health: quality report failed:", err);
    notes.push("Data-quality check skipped (report failed).");
  }

  // Check 4: landing pages — top N on the target day, then those pages over the
  // window via an inListFilter (two queries, not N+1).
  try {
    const topRows = await runReport(propertyId, token, {
      dateRanges: targetRange,
      dimensions: [{ name: "landingPage" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
      limit: config.topPages,
    });
    const topPages = toTopPageRows(topRows);
    const pageValues = topPages.map((p) => p.page).filter(Boolean);
    if (pageValues.length > 0) {
      const seriesRows = await runReport(propertyId, token, {
        dateRanges: windowRange,
        dimensions: [{ name: "date" }, { name: "landingPage" }],
        metrics: [{ name: "sessions" }, { name: keyMetric }],
        dimensionFilter: {
          filter: {
            fieldName: "landingPage",
            inListFilter: { values: pageValues },
          },
        },
        limit: 100000,
      });
      alerts.push(
        ...checkLandingPages(topPages, toPageDayRows(seriesRows), target, baseDates, config)
      );
    }
  } catch (err) {
    console.error("health: landing report failed:", err);
    notes.push("Landing-page check skipped (report failed).");
  }

  const sorted = sortAlerts(alerts);
  return NextResponse.json({
    target,
    ranAt: new Date().toISOString(),
    keyMetric,
    alerts: sorted,
    summary: summarize(sorted),
    notes,
  });
}
