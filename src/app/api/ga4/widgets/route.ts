import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { comparisonRange } from "@/lib/report";
import { pageFilterExpr, parsePageFilters } from "@/lib/ga4-filters";
import { batchRunReports, detectKeyMetric, ga4FailureMessage, Ga4Error } from "@/lib/ga4-api";
import { EXTRA_WIDGET_IDS } from "@/lib/dashboard-widgets";
import { EXTRA_SPECS, finishPageTitles, type TableData, type WidgetData } from "@/lib/extra-widgets";

function isoDay(v: string | null, fallback: string): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback;
}

// Data for the extra dashboard widgets in `ids` (one GA4 report each, batched),
// with the page's dates and filters. Computed on read, never stored.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const today = new Date().toISOString().slice(0, 10);
  const end = isoDay(url.searchParams.get("endDate"), today);
  const start = isoDay(url.searchParams.get("startDate"), `${end.slice(0, 4)}-01-01`);
  const compare = url.searchParams.get("compare") === "year" ? "year" : "period";
  const ids = (url.searchParams.get("ids") ?? "").split(",").filter((id) => EXTRA_WIDGET_IDS.includes(id));
  if (ids.length === 0) return NextResponse.json({ widgets: {} });
  const filters = parsePageFilters(url.searchParams);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const conn = await getGa4Connection(user.id);
  if (!conn) return NextResponse.json({ error: "Google Analytics is not connected." }, { status: 501 });
  if (!conn.property_id) return NextResponse.json({ error: "No GA4 property selected." }, { status: 400 });

  let token: string;
  try {
    token = await getAccessToken(conn.refresh_token);
  } catch (err) {
    console.error("GA4 token refresh failed:", err);
    return NextResponse.json({ error: "Google auth expired. Reconnect Google Analytics." }, { status: 401 });
  }

  try {
    const keyMetric = await detectKeyMetric(conn.property_id, token, request.signal);
    const prev = comparisonRange(start, end, compare);
    const current = [{ startDate: start, endDate: end }];
    const ctx = {
      current,
      withPrev: [...current, { startDate: prev.start, endDate: prev.end }],
      keyMetric,
      filter: pageFilterExpr(filters),
    };
    const results = await batchRunReports(
      conn.property_id,
      token,
      ids.map((id) => EXTRA_SPECS[id].body(ctx)),
      request.signal
    );
    const widgets: Record<string, WidgetData> = {};
    ids.forEach((id, i) => {
      const data = EXTRA_SPECS[id].parse(results[i] ?? []);
      widgets[id] = id === "pageTitles" ? finishPageTitles(data as TableData) : data;
    });
    return NextResponse.json({ widgets });
  } catch (err) {
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    console.error("widgets: GA4 report failed:", err);
    const status = err instanceof Ga4Error && err.status === 429 ? 429 : 502;
    return NextResponse.json({ error: ga4FailureMessage(err) }, { status });
  }
}
