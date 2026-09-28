import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, sweepExpired } from "@/lib/rate-limit";

// Collector for the one-line tracking snippet (/t.js). Public: called from
// clients' websites with their tracking key. Sent with navigator.sendBeacon as
// text/plain JSON, so there is no CORS preflight.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };
const KEY_TTL_MS = 5 * 60_000;
const RETENTION_DAYS = 180;
const keyCache = new Map<string, { at: number; owner: { userId: string; slug: string } | null }>();

async function ownerOf(key: string) {
  const hit = keyCache.get(key);
  if (hit && Date.now() - hit.at < KEY_TTL_MS) return hit.owner;
  const { data } = await createAdminClient().from("clients").select("user_id, slug").eq("tracking_key", key).maybeSingle();
  const owner = data ? { userId: data.user_id as string, slug: data.slug as string } : null;
  keyCache.set(key, { at: Date.now(), owner });
  return owner;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const tsOf = (v: unknown) => {
  const n = typeof v === "number" ? v : Date.now();
  // Never trust a client clock more than a day off.
  return new Date(Math.abs(n - Date.now()) > 86_400_000 ? Date.now() : n).toISOString();
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  const ok = () => new NextResponse(null, { status: 204, headers: CORS });
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    if (text.length > 8000) return ok();
    body = JSON.parse(text);
  } catch {
    return ok();
  }
  const key = str(body.k, 64);
  const visitor = str(body.v, 64);
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(key) || !/^[A-Za-z0-9_-]{8,64}$/.test(visitor)) return ok();

  sweepExpired();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`collect:${key}:${ip}`, 120, 60_000).allowed) return ok();

  const owner = await ownerOf(key).catch(() => null);
  if (!owner) return ok();
  const admin = createAdminClient();
  const base = { user_id: owner.userId, client_slug: owner.slug, visitor_id: visitor };

  if (body.type === "touch") {
    await admin.from("attribution_touches").insert({
      ...base,
      ts: tsOf(body.ts),
      source: str(body.s, 100) || "(direct)",
      medium: str(body.m, 100) || "(none)",
      campaign: str(body.c, 150),
      click_id_type: str(body.id, 20) || null,
      landing_path: str(body.p, 300) || null,
    });
  } else if (body.type === "conversion") {
    const value = Number(body.value);
    const row = {
      ...base,
      ts: tsOf(body.ts),
      event_name: str(body.e, 60) || "conversion",
      value: Number.isFinite(value) && value > 0 && value < 1e9 ? value : 0,
      currency: str(body.cur, 3) || null,
      transaction_id: str(body.txn, 100) || null,
    };
    // A repeated purchase (same transaction id, e.g. a reloaded thank-you page) is ignored.
    if (row.transaction_id) {
      await admin.from("attribution_conversions").upsert(row, { onConflict: "user_id,client_slug,transaction_id", ignoreDuplicates: true });
    } else {
      await admin.from("attribution_conversions").insert(row);
    }
  }

  // Now and then, drop raw rows past the retention window for this client.
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
    await admin.from("attribution_touches").delete().eq("user_id", owner.userId).eq("client_slug", owner.slug).lt("ts", cutoff);
    await admin.from("attribution_conversions").delete().eq("user_id", owner.userId).eq("client_slug", owner.slug).lt("ts", cutoff);
  }
  return ok();
}
