import { getAppUser } from "@/lib/team";
import { NextResponse } from "next/server";
import { listClients } from "@/lib/clients";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { batchRunReports, currentKeyEvents, detectKeyMetric, limitAll } from "@/lib/ga4-api";
import { searchAnalytics } from "@/lib/gsc";
import { totalsOf } from "@/lib/gsc-report";
import { healthFlags, last28, type Metric } from "@/lib/client-health";

// Clients overview: per client, 28-day sessions, key events (leads) and
// Search Console clicks with the previous 28 days, a daily sessions line, and
// health flags. Computed on read; clients load a few at a time.
export async function GET() {
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const clients = await listClients(user.id).catch(() => null);
  if (!clients) return NextResponse.json({ error: "Couldn't load clients." }, { status: 500 });

  const w = last28(new Date().toISOString().slice(0, 10));
  const both = [{ startDate: w.start, endDate: w.end }, { startDate: w.prevStart, endDate: w.prevEnd }];

  const results = await limitAll(
    clients.map((c) => async () => {
      const conn = await getGa4Connection(user.id, c.slug).catch(() => null);
      let googleError = !conn;
      let sessions: Metric | null = null;
      let leads: Metric | null = null;
      let clicks: Metric | null = null;
      let daily: number[] = [];
      let keyEventCount: number | null = null;
      let gscError = false;

      if (conn && c.property_id) {
        try {
          const token = await getAccessToken(conn.refresh_token);
          const pid = c.property_id;
          const [keyMetric, marked] = await Promise.all([detectKeyMetric(pid, token), currentKeyEvents(pid, token)]);
          keyEventCount = marked ? marked.size : null;
          const [totals, days] = await batchRunReports(pid, token, [
            { dateRanges: both, metrics: [{ name: "sessions" }, { name: keyMetric }] },
            {
              dateRanges: [both[0]],
              dimensions: [{ name: "date" }],
              metrics: [{ name: "sessions" }],
              orderBys: [{ dimension: { dimensionName: "date" } }],
              limit: 60,
            },
          ]);
          const byRange = (range: string, i: number) =>
            Number(totals.find((r) => r.dimensionValues?.[0]?.value === range)?.metricValues?.[i]?.value ?? 0);
          sessions = { current: byRange("date_range_0", 0), previous: byRange("date_range_1", 0) };
          leads = { current: byRange("date_range_0", 1), previous: byRange("date_range_1", 1) };
          daily = days.map((r) => Number(r.metricValues?.[0]?.value ?? 0));
        } catch (err) {
          console.error(`clients overview: GA4 failed for ${c.slug}:`, err);
          googleError = true;
        }
      }

      if (conn && c.gsc_site_url) {
        try {
          const token = await getAccessToken(conn.gsc_refresh_token ?? conn.refresh_token);
          const [cur, prev] = await Promise.all([
            searchAnalytics(token, c.gsc_site_url, { startDate: w.start, endDate: w.end }),
            searchAnalytics(token, c.gsc_site_url, { startDate: w.prevStart, endDate: w.prevEnd }),
          ]);
          clicks = { current: totalsOf(cur).clicks, previous: totalsOf(prev).clicks };
        } catch (err) {
          console.error(`clients overview: Search Console failed for ${c.slug}:`, err);
          gscError = true;
        }
      }

      return {
        slug: c.slug,
        name: c.name,
        domain: c.domain,
        propertyName: c.property_name,
        gscSiteUrl: c.gsc_site_url,
        sessions,
        leads,
        clicks,
        daily,
        flags: healthFlags({
          hasProperty: Boolean(c.property_id),
          hasSite: Boolean(c.gsc_site_url),
          googleError,
          keyEventCount,
          sessions,
          gscError,
        }),
      };
    }),
    3
  );

  return NextResponse.json({ range: w, clients: results });
}
