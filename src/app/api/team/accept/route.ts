import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Accept a team invite: the signed-in account must use the invited email.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("team_members")
    .select("id, email, owner_id")
    .eq("invite_token", token)
    .is("accepted_at", null)
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: "This invite isn't valid anymore." }, { status: 404 });
  if ((user.email ?? "").toLowerCase() !== String(invite.email).toLowerCase()) {
    return NextResponse.json(
      { error: `This invite is for ${invite.email}. Sign in with that email to accept it.` },
      { status: 403 }
    );
  }
  if (invite.owner_id === user.id) return NextResponse.json({ error: "You own this account." }, { status: 400 });
  const { error } = await admin
    .from("team_members")
    .update({ member_user_id: user.id, accepted_at: new Date().toISOString(), invite_token: null })
    .eq("id", invite.id);
  if (error) {
    const dup = error.code === "23505";
    return NextResponse.json(
      { error: dup ? "You're already on another team. Leave it first." : "Couldn't accept the invite." },
      { status: dup ? 409 : 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
