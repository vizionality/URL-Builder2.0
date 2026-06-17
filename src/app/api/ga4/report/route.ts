import { NextRequest, NextResponse } from "next/server";
import { BetaAnalyticsDataClient, protos } from "@google-analytics/data";

const { MetricAggregation } = protos.google.analytics.data.v1beta;

type ReportType = "campaigns" | "daily-sessions" | "engagement-by-source" | "summary";

function dimensionsAndMetrics(reportType: ReportType) {
  switch (reportType) {
    case "campaigns":
      return {
        dimensions: [{ name: "date" }, { name: "sessionCampaignName" }],
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
  const { propertyId, startDate, endDate, reportType } = await req.json();

  if (!propertyId || !startDate || !endDate || !reportType) {
    return NextResponse.json(
      { error: "propertyId, startDate, endDate, and reportType are required." },
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
    credentials = JSON.parse(saKey);
  } catch {
    return NextResponse.json(
      { error: "GA4_SA_KEY is not valid JSON." },
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch GA4 report." },
      { status: 500 }
    );
  }
}
