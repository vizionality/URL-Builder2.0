import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { GscAccessError, listSites } from "@/lib/gsc";

// Lists the Search Console sites the connected Google account can read, plus the saved one.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const conn = await getGa4Connection(user.id).catch(() => null);
  if (!conn) return NextResponse.json({ connected: false, sites: [], siteUrl: null });
  try {
    const token = await getAccessToken(conn.refresh_token);
    const sites = await listSites(token);
    return NextResponse.json({ connected: true, sites, siteUrl: conn.gsc_site_url ?? null });
  } catch (e) {
    const msg = e instanceof GscAccessError ? e.message : "Failed to list Search Console sites.";
    if (!(e instanceof GscAccessError)) console.error(e);
    return NextResponse.json({ connected: true, sites: [], siteUrl: conn.gsc_site_url ?? null, error: msg }, { status: e instanceof GscAccessError ? 403 : 500 });
  }
}
