import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { forbidUnless, getAppUser } from "@/lib/team";
import { clientParam, getClientBySlug } from "@/lib/clients";
import { bigQueryConfigured, DATASET, query } from "@/lib/bigquery";

// A client's attribution tracking setup: its snippet key, extra conversion
// events, and whether data is arriving. Key and events are admin-only.
const HINT = "Couldn't read attribution tracking. Has the attribution migration been run?";

async function context(req: NextRequest) {
  const me = await getAppUser();
  if (!me) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  const client = await getClientBySlug(me.id, clientParam(req)).catch(() => null);
  if (!client) return { error: NextResponse.json({ error: "Unknown client." }, { status: 404 }) };
  return { me, client: client as typeof client & { tracking_key?: string | null; conversion_events?: string[] } };
}

export async function GET(req: NextRequest) {
  const c = await context(req);
  if ("error" in c) return c.error;
  if (c.client.tracking_key === undefined) return NextResponse.json({ error: HINT, unavailable: true }, { status: 500 });
  // Install check: the latest touch and conversion in the last 7 days.
  let lastTouch: string | null = null;
  let lastConversion: string | null = null;
  if (bigQueryConfigured() && c.client.tracking_key) {
    try {
      const [row] = await query(
        `SELECT
           (SELECT MAX(ts) FROM \`${DATASET}.touches\` WHERE owner_id = @owner AND client_slug = @slug AND ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)) AS last_touch,
           (SELECT MAX(ts) FROM \`${DATASET}.conversions\` WHERE owner_id = @owner AND client_slug = @slug AND ts >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)) AS last_conversion`,
        [
          { name: "owner", type: "STRING", value: c.me.id },
          { name: "slug", type: "STRING", value: c.client.slug },
        ]
      );
      lastTouch = row?.last_touch ? new Date(row.last_touch as number).toISOString() : null;
      lastConversion = row?.last_conversion ? new Date(row.last_conversion as number).toISOString() : null;
    } catch (err) {
      console.error("attribution settings: status query failed:", err);
    }
  }
  return NextResponse.json({
    key: c.client.tracking_key ?? null,
    events: c.client.conversion_events ?? [],
    storageReady: bigQueryConfigured(),
    lastTouch,
    lastConversion,
  });
}

// Create (or replace) the tracking key. Replacing stops the old snippet.
export async function POST(req: NextRequest) {
  const c = await context(req);
  if ("error" in c) return c.error;
  const denied = forbidUnless(c.me, "admin");
  if (denied) return denied;
  const key = randomBytes(18).toString("base64url");
  const { error } = await createAdminClient().from("clients").update({ tracking_key: key }).eq("user_id", c.me.id).eq("slug", c.client.slug);
  if (error) return NextResponse.json({ error: HINT }, { status: 500 });
  return NextResponse.json({ key });
}

// Extra conversion events: { events: string[] } (generate_lead and purchase always count).
export async function PATCH(req: NextRequest) {
  const c = await context(req);
  if ("error" in c) return c.error;
  const denied = forbidUnless(c.me, "admin");
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const events = (Array.isArray(body.events) ? body.events : [])
    .filter((e: unknown): e is string => typeof e === "string" && /^[A-Za-z0-9_]{1,40}$/.test(e))
    .slice(0, 20);
  const { error } = await createAdminClient().from("clients").update({ conversion_events: events }).eq("user_id", c.me.id).eq("slug", c.client.slug);
  if (error) return NextResponse.json({ error: HINT }, { status: 500 });
  return NextResponse.json({ events });
}
