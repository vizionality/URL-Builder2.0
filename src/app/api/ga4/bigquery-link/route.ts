import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";

// Test: link the user's saved GA4 property to our BigQuery project (daily
// export, US) through the GA4 Admin API. Google's own error text is passed
// back so we can see exactly what it requires.
const ADMIN = "https://analyticsadmin.googleapis.com/v1alpha";

type BigQueryLink = {
  name?: string;
  project?: string;
  dailyExportEnabled?: boolean;
  streamingExportEnabled?: boolean;
  datasetLocation?: string;
  createTime?: string;
};

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const conn = await getGa4Connection(user.id).catch(() => null);
  if (!conn?.property_id) return { error: NextResponse.json({ error: "Save a GA4 property first." }, { status: 400 }) };
  let token: string;
  try {
    token = await getAccessToken(conn.refresh_token);
  } catch {
    return { error: NextResponse.json({ error: "Google auth expired. Reconnect Google." }, { status: 401 }) };
  }
  return { token, propertyId: conn.property_id };
}

async function googleError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    return JSON.parse(text).error?.message ?? text;
  } catch {
    return text;
  }
}

// Existing BigQuery links on the saved property.
export async function GET() {
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const res = await fetch(`${ADMIN}/properties/${ctx.propertyId}/bigQueryLinks`, {
    headers: { Authorization: `Bearer ${ctx.token}` },
  });
  if (!res.ok) return NextResponse.json({ error: await googleError(res), status: res.status }, { status: 502 });
  const d = await res.json();
  return NextResponse.json({
    propertyId: ctx.propertyId,
    project: process.env.BIGQUERY_PROJECT_ID ?? null,
    links: (d.bigqueryLinks ?? d.bigQueryLinks ?? []) as BigQueryLink[],
  });
}

// Create the link to BIGQUERY_PROJECT_ID.
export async function POST() {
  const project = process.env.BIGQUERY_PROJECT_ID;
  if (!project) return NextResponse.json({ error: "BIGQUERY_PROJECT_ID is not set." }, { status: 500 });
  const ctx = await context();
  if ("error" in ctx) return ctx.error;
  const res = await fetch(`${ADMIN}/properties/${ctx.propertyId}/bigQueryLinks`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ctx.token}`, "content-type": "application/json" },
    body: JSON.stringify({
      project: `projects/${project}`,
      dailyExportEnabled: true,
      streamingExportEnabled: false,
      datasetLocation: "US",
    }),
  });
  if (!res.ok) {
    const error = await googleError(res);
    console.error("BigQuery link failed:", res.status, error);
    return NextResponse.json({ error, status: res.status }, { status: 502 });
  }
  return NextResponse.json({ link: (await res.json()) as BigQueryLink });
}
