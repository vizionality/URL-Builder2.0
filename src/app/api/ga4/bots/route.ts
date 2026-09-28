import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/team";
import { clientParam } from "@/lib/clients";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { batchRunReports, ga4FailureMessage, Ga4Error, type RawRow } from "@/lib/ga4-api";
import { scoreSegment, spikeDays, type BotDimension, type Scored } from "@/lib/bot-signals";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const METRICS = ["sessions", "engagedSessions", "userEngagementDuration", "newUsers", "totalUsers"].map((name) => ({ name }));
const DIMENSIONS: { id: BotDimension; ga4: string[] }[] = [
  { id: "country", ga4: ["country"] },
  { id: "city", ga4: ["city"] },
  { id: "sourceMedium", ga4: ["sessionSourceMedium"] },
  { id: "browser", ga4: ["browser"] },
  { id: "screenResolution", ga4: ["screenResolution"] },
  { id: "landingPage", ga4: ["landingPage"] },
];

const n = (r: RawRow, i: number) => Number(r.metricValues?.[i]?.value ?? 0);

// Bot detection: every traffic segment (country, city, source, browser,
// screen size, landing page) scored on bot signals, plus the daily trend with
// unengaged spikes. Computed on read, never stored.
export async function GET(request: Request) {
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate") ?? "";
  const endDate = url.searchParams.get("endDate") ?? "";
  if (!ISO.test(startDate) || !ISO.test(endDate) || startDate > endDate) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }
  const conn = await getGa4Connection(user.id, clientParam(request));
  if (!conn?.property_id) return NextResponse.json({ error: "No GA4 property selected." }, { status: 400 });
  let token: string;
  try {
    token = await getAccessToken(conn.refresh_token);
  } catch {
    return NextResponse.json({ error: "Google auth expired. Reconnect Google Analytics." }, { status: 401 });
  }

  const dateRanges = [{ startDate, endDate }];
  const bodies = [
    ...DIMENSIONS.map((d) => ({
      dateRanges,
      dimensions: d.ga4.map((name) => ({ name })),
      metrics: METRICS,
      orderBys: [{ desc: true, metric: { metricName: "sessions" } }],
      limit: 250,
    })),
    { dateRanges, dimensions: [{ name: "date" }], metrics: METRICS, orderBys: [{ dimension: { dimensionName: "date" } }], limit: 400 },
    { dateRanges, metrics: METRICS },
  ];

  try {
    const reports = await batchRunReports(conn.property_id, token, bodies, request.signal);
    const segments: Record<string, Scored[]> = {};
    DIMENSIONS.forEach((d, i) => {
      segments[d.id] = (reports[i] ?? [])
        .map((r) =>
          scoreSegment(d.id, {
            value: r.dimensionValues?.[0]?.value ?? "(not set)",
            sessions: n(r, 0),
            engagedSessions: n(r, 1),
            engagementSeconds: n(r, 2),
            newUsers: n(r, 3),
            users: n(r, 4),
          })
        )
        .sort((a, b) => b.score - a.score || b.sessions - a.sessions);
    });
    const dayRows = reports[DIMENSIONS.length] ?? [];
    const days = dayRows.map((r) => {
      const d = r.dimensionValues?.[0]?.value ?? "";
      return { date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, sessions: n(r, 0), engagedSessions: n(r, 1) };
    });
    const spikes = spikeDays(days);
    const t = reports[DIMENSIONS.length + 1]?.[0];
    const totals = { sessions: t ? n(t, 0) : 0, engagedSessions: t ? n(t, 1) : 0 };
    // Sessions from bot-level cities (the finest location GA4 gives).
    const flaggedLocationSessions = segments.city.filter((s) => s.level === "bot").reduce((sum, s) => sum + s.sessions, 0);
    return NextResponse.json({
      totals,
      flaggedLocationSessions,
      days: days.map((d) => ({ ...d, spike: spikes.has(d.date) })),
      segments,
    });
  } catch (err) {
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    console.error("bots: GA4 report failed:", err);
    const status = err instanceof Ga4Error && err.status === 429 ? 429 : 502;
    return NextResponse.json({ error: ga4FailureMessage(err) }, { status });
  }
}
