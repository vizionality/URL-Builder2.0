import { clientParam } from "@/lib/clients";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";

// Reports the current user's GA4 connection status (no secrets).
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ connected: false });
  }

  try {
    const conn = await getGa4Connection(user.id, clientParam(request));
    if (!conn) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected: true,
      email: conn.email,
      propertyId: conn.property_id ?? "",
      propertyName: conn.property_name ?? "",
      gscSiteUrl: conn.gsc_site_url ?? null,
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
