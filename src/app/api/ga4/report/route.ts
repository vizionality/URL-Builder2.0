import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";
import { parseServiceAccountKey } from "@/lib/ga4-credentials";

const { MetricAggregation } = protos.google.analytics.data.v1beta;

type ReportType =
  | "campaigns"
  | "campaign-sessions"
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

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { propertyId, startDate, endDate, reportType } = body ?? {};

  if (!propertyId || !startDate || !endDate || !reportType) {
    return NextResponse.json(
      { error: "propertyId, startDate, endDate, and reportType are required." },
      { status: 400 }
    );
  }

  // GA4 property IDs are numeric. Validate to avoid injecting arbitrary values
  // into the property path.
  if (!/^\d+$/.test(String(propertyId))) {
    return NextResponse.json(
      { error: "propertyId must be a numeric GA4 property ID." },
      { status: 400 }
    );
  }

  const saKey = process.env.GA4_SA_KEY;
  if (!saKey) {
    return NextResponse.json(
      { error: "GA4 is not configured on the server." },
      { status: 501 }
    );
  }

  let credentials;
  try {
    credentials = parseServiceAccountKey(saKey);
  } catch {
    return NextResponse.json(
      { error: "GA4_SA_KEY is not valid JSON or base64." },
      { status: 500 }
    );
  }

  const config = dimensionsAndMetrics(reportType as ReportType);
  if (!config) {
    return NextResponse.json({ error: "Unknown reportType." }, { status: 400 });
  }

  try {
    const client = new BetaAnalyticsDataClient({ credentials });
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: config.dimensions,
      metrics: config.metrics,
      metricAggregations:
        reportType === "summary" ? [MetricAggregation.TOTAL] : undefined,
    });

    const rows = (response.rows ?? []).map((row) => ({
      dimensions: (row.dimensionValues ?? []).map((d) => d.value ?? ""),
      metrics: (row.metricValues ?? []).map((m) => m.value ?? ""),
    }));

    const totals = (response.totals?.[0]?.metricValues ?? []).map(
      (m) => m.value ?? ""
    );

    return NextResponse.json({ rows, totals });
  } catch (err) {
    // Log the upstream detail server-side; return a generic message so we don't
    // leak service-account emails, project IDs, or gRPC internals to the client.
    console.error("GA4 report request failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch GA4 report." },
      { status: 500 }
    );
  }
}
