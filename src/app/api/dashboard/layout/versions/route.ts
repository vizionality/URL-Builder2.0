import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { listVersions } from "@/lib/dashboard-layout-store";
import { sanitizeLayout } from "@/lib/dashboard-widgets";

// The signed-in user's saved layout versions for their connected property,
// newest first. Restoring is done by saving a version's widgets through
// PUT /api/dashboard/layout with restore: true.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const conn = await getGa4Connection(user.id);
  if (!conn?.property_id) return NextResponse.json({ error: "No GA4 property selected." }, { status: 400 });

  try {
    const versions = await listVersions(
      user.id,
      req.nextUrl.searchParams.get("page") === "ai" ? `${conn.property_id}:ai` : String(conn.property_id)
    );
    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        widgets: sanitizeLayout(v.widgets),
        createdAt: v.created_at,
        updatedAt: v.updated_at,
      })),
    });
  } catch (err) {
    // Most likely the version-history migration hasn't been run yet.
    console.error("dashboard layout versions: list failed:", err);
    return NextResponse.json({ versions: [], unavailable: true });
  }
}
