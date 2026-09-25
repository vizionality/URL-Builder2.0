import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { GscAccessError, searchAnalytics } from "@/lib/gsc";
import { dailySeries, itemsOf, totalsOf } from "@/lib/gsc-report";
import { previousPeriod } from "@/lib/report";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Search Console report for the SEO Dashboard: totals (with the previous
// period for %Δ), a daily trend, and top queries, pages, countries and devices.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const startDate = req.nextUrl.searchParams.get("startDate") ?? "";
  const endDate = req.nextUrl.searchParams.get("endDate") ?? "";
  if (!ISO.test(startDate) || !ISO.test(endDate) || startDate > endDate) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }
  const conn = await getGa4Connection(user.id).catch(() => null);
  if (!conn?.gsc_site_url) return NextResponse.json({ error: "No Search Console site selected.", code: "no_site" }, { status: 400 });
  const site = conn.gsc_site_url;
  try {
    const token = await getAccessToken(conn.refresh_token);
    const prev = previousPeriod(startDate, endDate);
    const range = { startDate, endDate };
    const [cur, before, daily, queries, pages, countries, devices] = await Promise.all([
      searchAnalytics(token, site, range),
      searchAnalytics(token, site, { startDate: prev.start, endDate: prev.end }),
      searchAnalytics(token, site, { ...range, dimensions: ["date"], rowLimit: 1000 }),
      searchAnalytics(token, site, { ...range, dimensions: ["query"], rowLimit: 250 }),
      searchAnalytics(token, site, { ...range, dimensions: ["page"], rowLimit: 250 }),
      searchAnalytics(token, site, { ...range, dimensions: ["country"], rowLimit: 50 }),
      searchAnalytics(token, site, { ...range, dimensions: ["device"] }),
    ]);
    return NextResponse.json({
      siteUrl: site,
      totals: totalsOf(cur),
      previous: totalsOf(before),
      daily: dailySeries(daily, startDate, endDate),
      queries: itemsOf(queries),
      pages: itemsOf(pages),
      countries: itemsOf(countries),
      devices: itemsOf(devices),
    });
  } catch (e) {
    if (e instanceof GscAccessError) return NextResponse.json({ error: e.message, code: "access" }, { status: 403 });
    console.error(e);
    return NextResponse.json({ error: "Failed to load Search Console data." }, { status: 500 });
  }
}
