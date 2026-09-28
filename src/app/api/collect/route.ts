import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "node:crypto";
import { rateLimit, sweepExpired } from "@/lib/rate-limit";
import { bigQueryConfigured, insertRows } from "@/lib/bigquery";

// Collector for the one-line tracking snippet (/t.js). Public: called from
// clients' websites with their tracking key. Every touch (from each visitor's
// first) and conversion streams into the app's BigQuery (lib/bigquery.ts). Sent with navigator.sendBeacon as
// text/plain JSON, so there is no CORS preflight.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };
const KEY_TTL_MS = 5 * 60_000;
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
  if (!bigQueryConfigured()) return ok();
  const base = { owner_id: owner.userId, client_slug: owner.slug, visitor_id: visitor };

  try {
    if (body.type === "touch") {
      await insertRows("touches", [{
        json: {
          ...base,
          ts: tsOf(body.ts),
          source: str(body.s, 100) || "(direct)",
          medium: str(body.m, 100) || "(none)",
          campaign: str(body.c, 150),
          click_id_type: str(body.id, 20) || null,
          landing_path: str(body.p, 300) || null,
        },
      }]);
    } else if (body.type === "conversion") {
      const value = Number(body.value);
      const txn = str(body.txn, 100) || null;
      const id = randomUUID();
      await insertRows("conversions", [{
        // A reloaded thank-you page repeats the transaction id; BigQuery drops
        // quick repeats, and reports count each transaction once.
        insertId: txn ? `${owner.userId}:${owner.slug}:${txn}` : id,
        json: {
          ...base,
          conversion_id: id,
          ts: tsOf(body.ts),
          event_name: str(body.e, 60) || "conversion",
          value: Number.isFinite(value) && value > 0 && value < 1e9 ? value : 0,
          currency: str(body.cur, 3) || null,
          transaction_id: txn,
        },
      }]);
    }
  } catch (err) {
    console.error("collect: BigQuery insert failed:", err);
  }
  return ok();
}
