import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getLayout, recordVersion, resetLayout, saveLayout } from "@/lib/dashboard-layout-store";
import { DEFAULT_LAYOUT, sanitizeLayout } from "@/lib/dashboard-widgets";

// The signed-in user and their connected property; layouts are saved per both.
async function owner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const conn = await getGa4Connection(user.id);
  if (!conn?.property_id) {
    return { error: NextResponse.json({ error: "No GA4 property selected." }, { status: 400 }) };
  }
  return { userId: user.id, propertyId: String(conn.property_id) };
}

export async function GET() {
  const o = await owner();
  if ("error" in o) return o.error;
  try {
    const saved = await getLayout(o.userId, o.propertyId);
    const widgets = saved ? sanitizeLayout(saved) : DEFAULT_LAYOUT;
    return NextResponse.json({ widgets, customized: saved != null });
  } catch (err) {
    // Missing table (migration not run) or a DB error: fall back to the default
    // so the dashboard still works.
    console.error("dashboard layout: load failed:", err);
    return NextResponse.json({ widgets: DEFAULT_LAYOUT, customized: false, saveUnavailable: true });
  }
}

export async function PUT(req: NextRequest) {
  const o = await owner();
  if ("error" in o) return o.error;
  let body: { widgets?: unknown; restore?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const widgets = sanitizeLayout(body.widgets);
  try {
    const previous = (await getLayout(o.userId, o.propertyId)) ?? DEFAULT_LAYOUT;
    await saveLayout(o.userId, o.propertyId, widgets);
    // Version history is best-effort: a failure (e.g. its migration not run
    // yet) never blocks saving the layout itself.
    try {
      await recordVersion(o.userId, o.propertyId, widgets, sanitizeLayout(previous), { forceNew: body.restore === true });
    } catch (err) {
      console.error("dashboard layout: version history failed:", err);
    }
    return NextResponse.json({ widgets, customized: true });
  } catch (err) {
    console.error("dashboard layout: save failed:", err);
    return NextResponse.json({ error: "Couldn't save your layout." }, { status: 500 });
  }
}

export async function DELETE() {
  const o = await owner();
  if ("error" in o) return o.error;
  try {
    await resetLayout(o.userId, o.propertyId);
    return NextResponse.json({ widgets: DEFAULT_LAYOUT, customized: false });
  } catch (err) {
    console.error("dashboard layout: reset failed:", err);
    return NextResponse.json({ error: "Couldn't reset your layout." }, { status: 500 });
  }
}
