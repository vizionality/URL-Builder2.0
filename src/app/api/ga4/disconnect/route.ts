import { forbidUnless, getAppUser } from "@/lib/team";
import { clientParam } from "@/lib/clients";
import { NextResponse } from "next/server";
import { deleteGa4Connection, getGa4Connection } from "@/lib/ga4-connection";
import { revokeToken } from "@/lib/google-oauth";

// Revokes the Google token and removes the stored connection.
export async function POST(request: Request) {
  // Team roles: needs at least admin.
  const me = await getAppUser();
  const denied = me ? forbidUnless(me, "admin") : null;
  if (denied) return denied;
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const conn = await getGa4Connection(user.id, clientParam(request));
  if (conn?.refresh_token) {
    await revokeToken(conn.refresh_token);
  }
  await deleteGa4Connection(user.id);
  return NextResponse.json({ ok: true });
}
