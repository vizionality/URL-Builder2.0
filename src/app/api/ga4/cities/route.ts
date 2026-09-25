import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { runReport, ga4FailureMessage, Ga4Error } from "@/lib/ga4-api";
// US city coordinates by state name, from the GeoNames gazetteer (CC BY 4.0,
// geonames.org) via the cities.json package. Server-only: never sent whole.
import usCitiesJson from "@/data/us-cities.json";
const usCities = usCitiesJson as unknown as Record<string, Record<string, [number, number]>>;
import { exactFilter, pageFilterExpr, parsePageFilters } from "@/lib/ga4-filters";

function isoDay(v: string | null, fallback: string): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback;
}

// New users by city within one US state, for the Geo Map drill-down.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const today = new Date().toISOString().slice(0, 10);
  const end = isoDay(url.searchParams.get("endDate"), today);
  const start = isoDay(url.searchParams.get("startDate"), `${end.slice(0, 4)}-01-01`);
  const region = (url.searchParams.get("region") ?? "").trim();
  if (!region) return NextResponse.json({ error: "Missing state." }, { status: 400 });
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
    const rows = await runReport(
      conn.property_id,
      token,
      {
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: "city" }],
        metrics: [{ name: "newUsers" }],
        orderBys: [{ desc: true, metric: { metricName: "newUsers" } }],
        limit: 50,
        ...pageFilterExpr(filters, [exactFilter("country", "United States"), exactFilter("region", region)]),
      },
      request.signal
    );
    const cities = rows
      .map((r) => ({ city: r.dimensionValues?.[0]?.value ?? "", newUsers: Number(r.metricValues?.[0]?.value ?? 0) }))
      .filter((c) => c.city && c.newUsers > 0)
      // GA4 gives city names only; attach coordinates for the heat map when known.
      .map((c) => {
        const at = usCities[region]?.[c.city];
        return at ? { ...c, lat: at[0], lng: at[1] } : c;
      });
    return NextResponse.json({ region, cities });
  } catch (err) {
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    console.error("cities: GA4 report failed:", err);
    const status = err instanceof Ga4Error && err.status === 429 ? 429 : 502;
    return NextResponse.json({ error: ga4FailureMessage(err) }, { status });
  }
}
