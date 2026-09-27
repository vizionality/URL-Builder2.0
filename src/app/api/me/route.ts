import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/team";
import { getPlan } from "@/lib/google-accounts";

// The signed-in person's role in the account they work in (for showing and
// hiding UI; the server enforces roles on every route).
export async function GET() {
  const me = await getAppUser();
  if (!me) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const plan = await getPlan(me.id).catch(() => "business");
  return NextResponse.json({ role: me.role, clients: me.clients, ownerEmail: me.ownerEmail, email: me.email, plan });
}
