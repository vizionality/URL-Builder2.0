import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";

type PropertySummary = { property?: string; displayName?: string };
type AccountSummary = {
  displayName?: string;
  propertySummaries?: PropertySummary[];
};

// Lists the GA4 properties the connected Google account can access.
export async function GET() {
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
      { status: 400 }
    );
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(conn.refresh_token);
  } catch {
    return NextResponse.json(
      { error: "Google auth expired. Reconnect Google Analytics." },
      { status: 401 }
    );
  }

  const res = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: `Failed to list properties: ${await res.text()}` },
      { status: 500 }
    );
  }

  const data = await res.json();
  const properties: { id: string; name: string; account: string }[] = [];
  for (const acct of (data.accountSummaries ?? []) as AccountSummary[]) {
    for (const prop of acct.propertySummaries ?? []) {
      properties.push({
        id: (prop.property ?? "").replace("properties/", ""),
        name: prop.displayName ?? prop.property ?? "",
        account: acct.displayName ?? "",
      });
    }
  }
  return NextResponse.json({ properties });
}
