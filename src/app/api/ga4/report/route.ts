import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";

type ReportType =
  | "campaigns"
  | "campaign-sessions"
  | "utm-breakdown"
  | "daily-sessions"
  | "engagement-by-source"
  | "summary";

function dimensionsAndMetrics(reportType: ReportType) {
  switch (reportType) {
    case "campaigns":
      return {
        dimensions: [{ name: "date" }, { name: "sessionCampaignName" }],
        metrics: [{ name: "sessions" }],
      };
    case "campaign-sessions":
      return {
        dimensions: [{ name: "sessionCampaignName" }],
        metrics: [{ name: "sessions" }],
      };
    case "utm-breakdown":
      return {
        dimensions: [
          { name: "sessionCampaignName" },
          { name: "sessionSource" },
          { name: "sessionMedium" },
        ],
        metrics: [{ name: "sessions" }],
      };
    case "daily-sessions":
      return {
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
      };
    case "engagement-by-source":
      return {
        dimensions: [{ name: "sessionSource" }],
        metrics: [{ name: "engagementRate" }],
      };
    case "summary":
      return {
        dimensions: [{ name: "sessionCampaignName" }],
        metrics: [{ name: "sessions" }, { name: "engagementRate" }],
      };
  }
}

type GaValue = { value?: string };
type GaRow = { dimensionValues?: GaValue[]; metricValues?: GaValue[] };

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { startDate, endDate, reportType } = parsed ?? {};

  if (!startDate || !endDate || !reportType) {
    return NextResponse.json(
      { error: "startDate, endDate, and reportType are required." },
      { status: 400 }
    );
  }

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
    return NextResponse.json(
      { error: "No GA4 property selected." },
      { status: 400 }
    );
  }

  const config = dimensionsAndMetrics(reportType as ReportType);
  if (!config) {
    return NextResponse.json({ error: "Unknown reportType." }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(conn.refresh_token);
  } catch (err) {
    console.error("GA4 token refresh failed:", err);
    return NextResponse.json(
      { error: "Google auth expired. Reconnect Google Analytics." },
      { status: 401 }
    );
  }

  const body = {
    dateRanges: [{ startDate, endDate }],
    dimensions: config.dimensions,
    metrics: config.metrics,
    ...(reportType === "summary" ? { metricAggregations: ["TOTAL"] } : {}),
  };

  try {
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${conn.property_id}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      // Log the upstream detail server-side; return a generic client message.
      console.error("GA4 report request failed:", res.status, await res.text());
      return NextResponse.json(
        { error: "Failed to fetch GA4 report." },
        { status: 500 }
      );
    }

    const data = await res.json();
    const rows = ((data.rows ?? []) as GaRow[]).map((row) => ({
      dimensions: (row.dimensionValues ?? []).map((d) => d.value ?? ""),
      metrics: (row.metricValues ?? []).map((m) => m.value ?? ""),
    }));
    const totals = ((data.totals?.[0]?.metricValues ?? []) as GaValue[]).map(
      (m) => m.value ?? ""
    );

    return NextResponse.json({ rows, totals });
  } catch (err) {
    console.error("GA4 report request failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch GA4 report." },
      { status: 500 }
    );
  }
}
