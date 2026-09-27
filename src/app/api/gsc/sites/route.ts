import { getAppUser } from "@/lib/team";
import { clientParam } from "@/lib/clients";
import { NextResponse } from "next/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getAccessToken } from "@/lib/google-oauth";
import { GscAccessError, listSites } from "@/lib/gsc";

// Lists the Search Console sites the connected Google account can read, plus the saved one.
export async function GET(request: Request) {
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const conn = await getGa4Connection(user.id, clientParam(request)).catch(() => null);
  if (!conn) return NextResponse.json({ connected: false, sites: [], siteUrl: null });
  try {
    const token = await getAccessToken(conn.gsc_refresh_token ?? conn.refresh_token);
    const sites = await listSites(token);
    return NextResponse.json({ connected: true, sites, siteUrl: conn.gsc_site_url ?? null });
  } catch (e) {
    const msg = e instanceof GscAccessError ? e.message : "Failed to list Search Console sites.";
    if (!(e instanceof GscAccessError)) console.error(e);
    return NextResponse.json({ connected: true, sites: [], siteUrl: conn.gsc_site_url ?? null, error: msg }, { status: e instanceof GscAccessError ? 403 : 500 });
  }
}
