import { forbidUnless, getAppUser } from "@/lib/team";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientParam, getClientBySlug } from "@/lib/clients";

// Builder data per client (saved URLs, bulk projects, UTM options, custom
// dashboard pages), so it follows the user between devices. The browser keeps
// a local copy and syncs through here.
const KEYS = new Set(["utmOptions", "savedUrls", "bulkRows", "bulkProjects", "dashboardPages"]);
const MAX_BYTES = 900_000;

async function owner(req: NextRequest) {
  const user = await getAppUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const slug = clientParam(req);
  const key = req.nextUrl.searchParams.get("key") ?? "";
  if (!KEYS.has(key)) return { error: NextResponse.json({ error: "Unknown key." }, { status: 400 }) };
  const client = await getClientBySlug(user.id, slug).catch(() => null);
  if (!client) return { error: NextResponse.json({ error: "Unknown client." }, { status: 404 }) };
  return { userId: user.id, slug: client.slug, key };
}

export async function GET(req: NextRequest) {
  const o = await owner(req);
  if ("error" in o) return o.error;
  const { data, error } = await createAdminClient()
    .from("client_data")
    .select("value, updated_at")
    .eq("user_id", o.userId)
    .eq("client_slug", o.slug)
    .eq("key", o.key)
    .maybeSingle();
  if (error) {
    console.error("client-data: read failed:", error);
    return NextResponse.json({ error: "Couldn't read saved data.", unavailable: true }, { status: 500 });
  }
  return NextResponse.json({ value: data?.value ?? null, updatedAt: data?.updated_at ?? null });
}

export async function PUT(req: NextRequest) {
  // Team roles: needs at least analyst.
  const me = await getAppUser();
  const denied = me ? forbidUnless(me, "analyst") : null;
  if (denied) return denied;
  const o = await owner(req);
  if ("error" in o) return o.error;
  const text = await req.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ error: "Too much data to save." }, { status: 413 });
  let body: { value?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (body.value === undefined) return NextResponse.json({ error: "value is required." }, { status: 400 });
  const { error } = await createAdminClient()
    .from("client_data")
    .upsert(
      { user_id: o.userId, client_slug: o.slug, key: o.key, value: body.value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,client_slug,key" }
    );
  if (error) {
    console.error("client-data: save failed:", error);
    return NextResponse.json({ error: "Couldn't save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
