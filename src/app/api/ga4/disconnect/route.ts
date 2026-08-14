import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteGa4Connection, getGa4Connection } from "@/lib/ga4-connection";
import { revokeToken } from "@/lib/google-oauth";

// Revokes the Google token and removes the stored connection.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const conn = await getGa4Connection(user.id);
  if (conn?.refresh_token) {
    await revokeToken(conn.refresh_token);
  }
  await deleteGa4Connection(user.id);
  return NextResponse.json({ ok: true });
}
