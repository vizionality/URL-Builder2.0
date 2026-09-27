import { NextResponse } from "next/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { requestUser } from "@/lib/portal";

// Reports the current user's GA4 connection status (no secrets). A read-only
// client portal link gets the property only, not the account email.
export async function GET(request: Request) {
  const { user, clientSlug, viaShare } = await requestUser(request, { allowShare: true });
  if (!user) {
    return NextResponse.json({ connected: false });
  }

  try {
    const conn = await getGa4Connection(user.id, clientSlug);
    if (!conn) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected: true,
      email: viaShare ? null : conn.email,
      propertyId: conn.property_id ?? "",
      propertyName: conn.property_name ?? "",
      gscSiteUrl: conn.gsc_site_url ?? null,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
