import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listSites, createSite, updateSite } from "@/lib/attribution/sites";

// Authenticated management of the caller's own attribution sites. Every call is
// scoped to the session user, so one account never sees or edits another's.

function cleanOrigins(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((o): o is string => typeof o === "string")
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function cleanHost(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const h = input.trim().toLowerCase();
  if (!h) return null;
  // Basic hostname shape; the real check is the CNAME actually resolving.
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(h) ? h : null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    return NextResponse.json({ sites: await listSites(user.id) });
  } catch (err) {
    console.error("attribution sites: list failed:", err);
    return NextResponse.json({ error: "Failed to load sites." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: { name?: unknown; collector_host?: unknown; allowed_origins?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  try {
    const site = await createSite(
      user.id,
      name,
      cleanHost(body.collector_host),
      cleanOrigins(body.allowed_origins)
    );
    return NextResponse.json({ site });
  } catch (err) {
    console.error("attribution sites: create failed:", err);
    return NextResponse.json({ error: "Failed to create site." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: {
    id?: unknown;
    name?: unknown;
    collector_host?: unknown;
    allowed_origins?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const patch: { name?: string; collector_host?: string | null; allowed_origins?: string[] } = {};
  if (typeof body.name === "string") patch.name = body.name.trim().slice(0, 120);
  if (body.collector_host !== undefined) patch.collector_host = cleanHost(body.collector_host);
  if (body.allowed_origins !== undefined) patch.allowed_origins = cleanOrigins(body.allowed_origins);

  try {
    await updateSite(user.id, body.id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("attribution sites: update failed:", err);
    return NextResponse.json({ error: "Failed to update site." }, { status: 500 });
  }
}
