import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forbidUnless, getAppUser } from "@/lib/team";
import { clientParam, getClientBySlug, updateClient } from "@/lib/clients";
import { BOT_DIMENSIONS, listBotRules } from "@/lib/bot-filter";
import type { BotDimension } from "@/lib/bot-signals";

// A client's bot filter: the rules every GA4 report leaves out, and the
// on/off switch. Reading is open to the team; changes need an analyst.
async function context(req: NextRequest, write: boolean) {
  const me = await getAppUser();
  if (!me) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  if (write) {
    const denied = forbidUnless(me, "analyst");
    if (denied) return { error: denied };
  }
  const client = await getClientBySlug(me.id, clientParam(req)).catch(() => null);
  if (!client) return { error: NextResponse.json({ error: "Unknown client." }, { status: 404 }) };
  return { me, client };
}

const MIGRATION_HINT = "Couldn't read the bot filter. Has the bot filter migration been run?";

export async function GET(req: NextRequest) {
  const c = await context(req, false);
  if ("error" in c) return c.error;
  try {
    const rules = await listBotRules(c.me.id, c.client.slug);
    const enabled = c.client.bot_filter_enabled !== false;
    return NextResponse.json({ enabled, rules: rules.map((r) => ({ id: r.id, dimension: r.dimension, value: r.value, createdBy: r.created_by, createdAt: r.created_at })) });
  } catch (err) {
    console.error("bot-filter: list failed:", err);
    return NextResponse.json({ error: MIGRATION_HINT, unavailable: true }, { status: 500 });
  }
}

// Add rules: { rules: [{ dimension, value }] } (duplicates are ignored).
export async function POST(req: NextRequest) {
  const c = await context(req, true);
  if ("error" in c) return c.error;
  const body = await req.json().catch(() => ({}));
  const list: unknown[] = Array.isArray(body.rules) ? body.rules : [];
  const rows = list
    .map((r) => r as { dimension?: unknown; value?: unknown })
    .filter((r): r is { dimension: BotDimension; value: string } =>
      BOT_DIMENSIONS.includes(r.dimension as BotDimension) && typeof r.value === "string" && r.value.trim() !== "" && r.value.length <= 500
    )
    .slice(0, 200)
    .map((r) => ({ user_id: c.me.id, client_slug: c.client.slug, dimension: r.dimension, value: r.value.trim(), created_by: c.me.email || null }));
  if (rows.length === 0) return NextResponse.json({ error: "Nothing to add." }, { status: 400 });
  const { error } = await createAdminClient()
    .from("bot_filters")
    .upsert(rows, { onConflict: "user_id,client_slug,dimension,value", ignoreDuplicates: true });
  if (error) {
    console.error("bot-filter: add failed:", error);
    return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
  }
  return NextResponse.json({ ok: true, added: rows.length });
}

export async function DELETE(req: NextRequest) {
  const c = await context(req, true);
  if ("error" in c) return c.error;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const { error } = await createAdminClient()
    .from("bot_filters")
    .delete()
    .eq("user_id", c.me.id)
    .eq("client_slug", c.client.slug)
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't remove the rule." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Switch the whole filter on or off: { enabled: boolean }.
export async function PATCH(req: NextRequest) {
  const c = await context(req, true);
  if ("error" in c) return c.error;
  const body = await req.json().catch(() => ({}));
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "enabled is required." }, { status: 400 });
  try {
    await updateClient(c.me.id, c.client.slug, { bot_filter_enabled: body.enabled });
  } catch {
    return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
  }
  return NextResponse.json({ ok: true, enabled: body.enabled });
}
