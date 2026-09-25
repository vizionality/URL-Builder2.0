import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { clearKeyEventsCache, currentKeyEvents, ga4FailureMessage, runReport } from "@/lib/ga4-api";
import { isValidEventName, suggestKeyEvents } from "@/lib/key-event-suggestions";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const conn = await getGa4Connection(user.id).catch(() => null);
  if (!conn?.property_id) return { error: NextResponse.json({ error: "No GA4 property selected." }, { status: 400 }) };
  try {
    return { propertyId: conn.property_id, token: await getAccessToken(conn.refresh_token) };
  } catch {
    return { error: NextResponse.json({ error: "Google auth expired. Reconnect Google Analytics." }, { status: 401 }) };
  }
}

// The property's events in the range with the ones worth marking as key events.
export async function GET(req: NextRequest) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const startDate = req.nextUrl.searchParams.get("startDate") ?? "";
  const endDate = req.nextUrl.searchParams.get("endDate") ?? "";
  if (!ISO.test(startDate) || !ISO.test(endDate)) return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  try {
    const [rows, marked] = await Promise.all([
      runReport(ctx.propertyId, ctx.token, {
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        orderBys: [{ desc: true, metric: { metricName: "eventCount" } }],
        limit: 200,
      }, req.signal),
      currentKeyEvents(ctx.propertyId, ctx.token, req.signal),
    ]);
    const events = rows.map((r) => ({
      name: r.dimensionValues?.[0]?.value ?? "",
      count: Number(r.metricValues?.[0]?.value ?? 0),
    }));
    return NextResponse.json({
      events,
      keyEvents: marked ? [...marked] : [],
      suggestions: suggestKeyEvents(events, marked ?? new Set()),
    });
  } catch (err) {
    console.error("key-events: report failed:", err);
    return NextResponse.json({ error: ga4FailureMessage(err) }, { status: 502 });
  }
}

// Mark an event as a key event in GA4 (counts from now on, not retroactively).
export async function POST(req: NextRequest) {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const body = await req.json().catch(() => ({}));
  const eventName = String(body.eventName ?? "");
  if (!isValidEventName(eventName)) return NextResponse.json({ error: "Invalid event name." }, { status: 400 });
  const res = await fetch(`https://analyticsadmin.googleapis.com/v1beta/properties/${ctx.propertyId}/keyEvents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ctx.token}`, "content-type": "application/json" },
    body: JSON.stringify({ eventName, countingMethod: "ONCE_PER_EVENT" }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("key-events: create failed:", res.status, text);
    const insufficient = res.status === 403;
    return NextResponse.json(
      {
        error: insufficient
          ? "Google refused. You need Editor access on this GA4 property, and may need to reconnect Google."
          : "Couldn't mark it as a key event. Try again or mark it in GA4 Admin > Events.",
      },
      { status: 502 }
    );
  }
  clearKeyEventsCache();
  return NextResponse.json({ ok: true, eventName });
}
