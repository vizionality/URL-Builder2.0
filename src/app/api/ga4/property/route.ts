import { forbidUnless, getAppUser } from "@/lib/team";
import { NextRequest, NextResponse } from "next/server";
import { setGa4Property } from "@/lib/ga4-connection";
import { clientParam } from "@/lib/clients";

// Saves the selected GA4 property for the current user.
export async function POST(req: NextRequest) {
  // Team roles: needs at least admin.
  const me = await getAppUser();
  const denied = me ? forbidUnless(me, "admin") : null;
  if (denied) return denied;
  const { propertyId, propertyName } = (await req.json()) as {
    propertyId?: string;
    propertyName?: string;
  };
  if (!propertyId) {
    return NextResponse.json(
      { error: "propertyId is required." },
      { status: 400 }
    );
  }
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  await setGa4Property(user.id, String(propertyId), propertyName ?? null, clientParam(req));
  return NextResponse.json({ ok: true });
}
