import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppUser } from "@/lib/team";
import { clientParam, getClientBySlug } from "@/lib/clients";
import { attribute, type Touch } from "@/lib/attribution";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CONVERSIONS = 20_000;
const DAY = 86_400_000;

// Attribution report from the tracker's own data: conversions in the range,
// credited to the touches of each visitor within the lookback window, under
// every model at once. Computed on read.
export async function GET(req: NextRequest) {
  const me = await getAppUser();
  if (!me) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const client = await getClientBySlug(me.id, clientParam(req)).catch(() => null);
  if (!client) return NextResponse.json({ error: "Unknown client." }, { status: 404 });
  const q = req.nextUrl.searchParams;
  const startDate = q.get("startDate") ?? "";
  const endDate = q.get("endDate") ?? "";
  if (!ISO.test(startDate) || !ISO.test(endDate) || startDate > endDate) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }
  const lookback = [7, 30, 60, 90].includes(Number(q.get("lookback"))) ? Number(q.get("lookback")) : 30;
  const events = (q.get("events") ?? "").split(",").filter(Boolean);
  const admin = createAdminClient();
  const start = `${startDate}T00:00:00Z`;
  const end = `${endDate}T23:59:59.999Z`;

  let conv = admin
    .from("attribution_conversions")
    .select("visitor_id, ts, event_name, value")
    .eq("user_id", me.id)
    .eq("client_slug", client.slug)
    .gte("ts", start)
    .lte("ts", end)
    .order("ts", { ascending: true })
    .limit(MAX_CONVERSIONS);
  if (events.length) conv = conv.in("event_name", events);
  const { data: convRows, error } = await conv;
  if (error) {
    console.error("attribution: conversions failed:", error);
    return NextResponse.json({ error: "Couldn't read attribution data. Has the attribution migration been run?" }, { status: 500 });
  }

  // Touches of the converting visitors only, from the lookback before the range.
  const visitors = [...new Set((convRows ?? []).map((r) => r.visitor_id as string))];
  const touches = new Map<string, Touch[]>();
  const from = new Date(Date.parse(start) - lookback * DAY).toISOString();
  for (let i = 0; i < visitors.length; i += 300) {
    const { data } = await admin
      .from("attribution_touches")
      .select("visitor_id, ts, source, medium, campaign")
      .eq("user_id", me.id)
      .eq("client_slug", client.slug)
      .in("visitor_id", visitors.slice(i, i + 300))
      .gte("ts", from)
      .lte("ts", end)
      .order("ts", { ascending: true })
      .limit(50_000);
    for (const r of data ?? []) {
      const list = touches.get(r.visitor_id as string) ?? [];
      list.push({ ts: Date.parse(r.ts as string), source: r.source as string, medium: r.medium as string, campaign: (r.campaign as string) ?? "" });
      touches.set(r.visitor_id as string, list);
    }
  }

  const eventNames = [...new Set((convRows ?? []).map((r) => r.event_name as string))];
  const result = attribute(
    (convRows ?? []).map((r) => ({ visitor: r.visitor_id as string, ts: Date.parse(r.ts as string), value: Number(r.value) || 0 })),
    touches,
    lookback
  );
  return NextResponse.json({ ...result, lookback, eventNames, truncated: (convRows ?? []).length >= MAX_CONVERSIONS });
}
