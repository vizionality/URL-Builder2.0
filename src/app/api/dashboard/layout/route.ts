import { forbidUnless, getAppUser } from "@/lib/team";
import { requestUser } from "@/lib/portal";
import { NextRequest, NextResponse } from "next/server";
import { getGa4Connection } from "@/lib/ga4-connection";
import { getClientBySlug } from "@/lib/clients";
import { atLeast } from "@/lib/roles";
import { getLayout, recordVersion, resetLayout, saveLayout } from "@/lib/dashboard-layout-store";
import { DEFAULT_LAYOUT, sanitizeLayout } from "@/lib/dashboard-widgets";

// The account and the layout's key: per client ("client:<slug>"), or per GA4
// property outside a client. "?page=ai" (AI Overview) keeps its own (":ai").
// `legacyKey` is the per-property key, read when a client has no layout yet.
async function owner(req: NextRequest) {
  // GET also serves read-only client portal links; saving needs a session.
  const { user, clientSlug } = await requestUser(req, { allowShare: req.method === "GET" });
  if (!user) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const conn = await getGa4Connection(user.id, clientSlug);
  if (!conn?.property_id) {
    return { error: NextResponse.json({ error: "No GA4 property selected." }, { status: 400 }) };
  }
  const suffix = req.nextUrl.searchParams.get("page") === "ai" ? ":ai" : "";
  const legacyKey = `${conn.property_id}${suffix}`;
  const client = clientSlug ? await getClientBySlug(user.id, clientSlug).catch(() => null) : null;
  return {
    userId: user.id,
    propertyId: client ? `client:${client.slug}${suffix}` : legacyKey,
    legacyKey,
    locked: Boolean(client?.layout_locked),
  };
}

// Locked client dashboards change only by an admin (or the owner).
async function lockedFor(o: { locked: boolean }): Promise<NextResponse | null> {
  if (!o.locked) return null;
  const me = await getAppUser();
  if (me && atLeast(me.role, "admin")) return null;
  return NextResponse.json({ error: "This dashboard is locked. Ask an admin to unlock it.", code: "locked" }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const o = await owner(req);
  if ("error" in o) return o.error;
  try {
    const saved =
      (await getLayout(o.userId, o.propertyId)) ??
      (o.legacyKey !== o.propertyId ? await getLayout(o.userId, o.legacyKey) : null);
    const widgets = saved ? sanitizeLayout(saved) : DEFAULT_LAYOUT;
    return NextResponse.json({ widgets, customized: saved != null, locked: o.locked });
  } catch (err) {
    // Missing table (migration not run) or a DB error: fall back to the default
    // so the dashboard still works.
    console.error("dashboard layout: load failed:", err);
    return NextResponse.json({ widgets: DEFAULT_LAYOUT, customized: false, saveUnavailable: true });
  }
}

export async function PUT(req: NextRequest) {
  // Team roles: needs at least analyst.
  const me = await getAppUser();
  const denied = me ? forbidUnless(me, "analyst") : null;
  if (denied) return denied;
  const o = await owner(req);
  if ("error" in o) return o.error;
  const isLocked = await lockedFor(o);
  if (isLocked) return isLocked;
  let body: { widgets?: unknown; restore?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const widgets = sanitizeLayout(body.widgets);
  try {
    const previous =
      (await getLayout(o.userId, o.propertyId)) ??
      (o.legacyKey !== o.propertyId ? await getLayout(o.userId, o.legacyKey) : null) ??
      DEFAULT_LAYOUT;
    await saveLayout(o.userId, o.propertyId, widgets);
    // Version history is best-effort: a failure (e.g. its migration not run
    // yet) never blocks saving the layout itself.
    try {
      await recordVersion(o.userId, o.propertyId, widgets, sanitizeLayout(previous), {
        forceNew: body.restore === true,
        editedBy: me?.email || null,
      });
    } catch (err) {
      console.error("dashboard layout: version history failed:", err);
    }
    return NextResponse.json({ widgets, customized: true });
  } catch (err) {
    console.error("dashboard layout: save failed:", err);
    return NextResponse.json({ error: "Couldn't save your layout." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Team roles: needs at least analyst.
  const me = await getAppUser();
  const denied = me ? forbidUnless(me, "analyst") : null;
  if (denied) return denied;
  const o = await owner(req);
  if ("error" in o) return o.error;
  const isLocked = await lockedFor(o);
  if (isLocked) return isLocked;
  try {
    await resetLayout(o.userId, o.propertyId);
    return NextResponse.json({ widgets: DEFAULT_LAYOUT, customized: false });
  } catch (err) {
    console.error("dashboard layout: reset failed:", err);
    return NextResponse.json({ error: "Couldn't reset your layout." }, { status: 500 });
  }
}
