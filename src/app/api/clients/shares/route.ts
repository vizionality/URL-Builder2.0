import { forbidUnless, getAppUser } from "@/lib/team";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientParam, getClientBySlug } from "@/lib/clients";
import { hashPassword, newToken } from "@/lib/portal";

// A client's read-only portal links: list, create (optional password), revoke.
async function owner(req: NextRequest) {
  const user = await getAppUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const client = await getClientBySlug(user.id, clientParam(req)).catch(() => null);
  if (!client) return { error: NextResponse.json({ error: "Unknown client." }, { status: 404 }) };
  return { userId: user.id, slug: client.slug };
}

export async function GET(req: NextRequest) {
  const o = await owner(req);
  if ("error" in o) return o.error;
  const { data, error } = await createAdminClient()
    .from("client_shares")
    .select("id, token, password_hash, created_at")
    .eq("user_id", o.userId)
    .eq("client_slug", o.slug)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("shares: list failed:", error);
    return NextResponse.json({ error: "Couldn't load links. Has the latest migration been run?" }, { status: 500 });
  }
  return NextResponse.json({
    shares: (data ?? []).map((s) => ({ id: s.id, token: s.token, hasPassword: Boolean(s.password_hash), createdAt: s.created_at })),
  });
}

export async function POST(req: NextRequest) {
  // Team roles: needs at least analyst.
  const me = await getAppUser();
  const denied = me ? forbidUnless(me, "analyst") : null;
  if (denied) return denied;
  const o = await owner(req);
  if ("error" in o) return o.error;
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (password && password.length < 6) {
    return NextResponse.json({ error: "Use at least 6 characters for the password." }, { status: 400 });
  }
  const { data, error } = await createAdminClient()
    .from("client_shares")
    .insert({ user_id: o.userId, client_slug: o.slug, token: newToken(), password_hash: password ? hashPassword(password) : null })
    .select("id, token")
    .single();
  if (error) {
    console.error("shares: create failed:", error);
    return NextResponse.json({ error: "Couldn't create the link." }, { status: 500 });
  }
  return NextResponse.json({ share: data });
}

export async function DELETE(req: NextRequest) {
  // Team roles: needs at least analyst.
  const me = await getAppUser();
  const denied = me ? forbidUnless(me, "analyst") : null;
  if (denied) return denied;
  const o = await owner(req);
  if ("error" in o) return o.error;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const { error } = await createAdminClient()
    .from("client_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", o.userId)
    .eq("client_slug", o.slug)
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't revoke the link." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
