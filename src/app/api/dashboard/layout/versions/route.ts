import { getAppUser } from "@/lib/team";
import { clientParam, getClientBySlug } from "@/lib/clients";
import { NextRequest, NextResponse } from "next/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { listVersions } from "@/lib/dashboard-layout-store";
import { sanitizeLayout } from "@/lib/dashboard-widgets";

// The signed-in user's saved layout versions for their connected property,
// newest first. Restoring is done by saving a version's widgets through
// PUT /api/dashboard/layout with restore: true.
export async function GET(req: NextRequest) {
  const user = await getAppUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const conn = await getGa4Connection(user.id, clientParam(req));
  if (!conn?.property_id) return NextResponse.json({ error: "No GA4 property selected." }, { status: 400 });

  try {
    // Same key as the layout: per client, else per property.
    const suffix = req.nextUrl.searchParams.get("page") === "ai" ? ":ai" : "";
    const slug = clientParam(req);
    const client = slug ? await getClientBySlug(user.id, slug).catch(() => null) : null;
    const versions = await listVersions(user.id, client ? `client:${client.slug}${suffix}` : `${conn.property_id}${suffix}`);
    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        widgets: sanitizeLayout(v.widgets),
        createdAt: v.created_at,
        updatedAt: v.updated_at,
        editedBy: v.edited_by ?? null,
      })),
    });
  } catch (err) {
    // Most likely the version-history migration hasn't been run yet.
    console.error("dashboard layout versions: list failed:", err);
    return NextResponse.json({ versions: [], unavailable: true });
  }
}
