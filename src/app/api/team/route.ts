import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forbidUnless, getAppUser } from "@/lib/team";
import { getPlan } from "@/lib/google-accounts";
import { listClients } from "@/lib/clients";
import { parseMemberRole } from "@/lib/roles";

// Team members of the account (admins and the owner): list, invite, change
// role or clients, remove. Invites are links to copy (no email is sent).
async function admin() {
  const me = await getAppUser();
  if (!me) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const denied = forbidUnless(me, "admin");
  if (denied) return { error: denied };
  return { me };
}

// Client slugs to store: null (all clients) or the account's own slugs.
async function cleanSlugs(ownerId: string, v: unknown): Promise<string[] | null> {
  if (!Array.isArray(v)) return null;
  const own = new Set((await listClients(ownerId)).map((c) => c.slug));
  return v.filter((s): s is string => typeof s === "string" && own.has(s));
}

export async function GET() {
  const a = await admin();
  if ("error" in a) return a.error;
  const { data, error } = await createAdminClient()
    .from("team_members")
    .select("id, email, role, client_slugs, invite_token, invited_at, accepted_at")
    .eq("owner_id", a.me.id)
    .order("invited_at", { ascending: true });
  if (error) {
    console.error("team: list failed:", error);
    return NextResponse.json({ error: "Couldn't load the team. Has the team migration been run?" }, { status: 500 });
  }
  return NextResponse.json({
    plan: await getPlan(a.me.id),
    members: (data ?? []).map((m) => ({
      id: m.id,
      email: m.email,
      role: m.role,
      clients: m.client_slugs,
      status: m.accepted_at ? "active" : "invited",
      inviteToken: m.accepted_at ? null : m.invite_token,
      invitedAt: m.invited_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  const a = await admin();
  if ("error" in a) return a.error;
  if ((await getPlan(a.me.id)) !== "agency") {
    return NextResponse.json({ error: "Team members are part of the Agency plan.", code: "plan_limit" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = parseMemberRole(body.role);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (!role) return NextResponse.json({ error: "Pick a role." }, { status: 400 });
  if (email === a.me.email.toLowerCase() || email === a.me.ownerEmail?.toLowerCase()) {
    return NextResponse.json({ error: "That's already part of this account." }, { status: 400 });
  }
  const { data, error } = await createAdminClient()
    .from("team_members")
    .insert({
      owner_id: a.me.id,
      email,
      role,
      client_slugs: await cleanSlugs(a.me.id, body.clients),
      invite_token: randomBytes(24).toString("base64url"),
    })
    .select("id, invite_token")
    .single();
  if (error) {
    const dup = error.code === "23505";
    return NextResponse.json({ error: dup ? "That email is already on the team." : "Couldn't invite." }, { status: dup ? 409 : 500 });
  }
  return NextResponse.json({ member: { id: data.id, inviteToken: data.invite_token } });
}

export async function PATCH(req: NextRequest) {
  const a = await admin();
  if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const patch: Record<string, unknown> = {};
  if (body.role !== undefined) {
    const role = parseMemberRole(body.role);
    if (!role) return NextResponse.json({ error: "Unknown role." }, { status: 400 });
    patch.role = role;
  }
  if (body.clients !== undefined) patch.client_slugs = await cleanSlugs(a.me.id, body.clients);
  // Nobody changes their own role or access.
  const { data: target } = await createAdminClient().from("team_members").select("member_user_id").eq("id", id).eq("owner_id", a.me.id).maybeSingle();
  if (!target) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (target.member_user_id === a.me.sessionUserId) return NextResponse.json({ error: "You can't change your own access." }, { status: 400 });
  const { error } = await createAdminClient().from("team_members").update(patch).eq("id", id).eq("owner_id", a.me.id);
  if (error) return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const a = await admin();
  if ("error" in a) return a.error;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const { error } = await createAdminClient().from("team_members").delete().eq("id", id).eq("owner_id", a.me.id);
  if (error) return NextResponse.json({ error: "Couldn't remove." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
