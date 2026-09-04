import { NextRequest, NextResponse } from "next/server";
import { rateLimit, sweepExpired } from "@/lib/rate-limit";
import { resolveSite, type AttributionSite } from "@/lib/attribution/sites";
import { upsertVisitor, insertTouches, insertConversion } from "@/lib/attribution/store";
import {
  normalizeTouches,
  normalizeConversion,
  hasSignal,
  isValidUuid,
} from "@/lib/attribution/payload";
import type { CollectBody } from "@/lib/attribution/types";
import { randomUUID } from "node:crypto";

// Server-owned first-party visitor cookie. Set on the client's collector host,
// so it is first-party to their site and survives Safari ITP (unlike a
// JavaScript-set cookie). Host-only: only the collector reads it back.
const VID_COOKIE = "attr_srv_vid";
const COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // ~400 days

const RATE_LIMIT = 120; // beacons per minute per site+IP
const RATE_WINDOW_MS = 60_000;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function originAllowed(origin: string | null, site: AttributionSite): boolean {
  if (site.allowed_origins.length === 0) return true; // not configured -> allow
  if (!origin) return true; // beacons may omit Origin
  return site.allowed_origins.includes(origin);
}

function corsHeaders(origin: string | null): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
  };
  if (origin) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Credentials"] = "true";
    h["Vary"] = "Origin";
  }
  return h;
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  let body: CollectBody;
  try {
    // The snippet sends text/plain to avoid a CORS preflight; parse it as JSON.
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400, headers: cors });
  }

  const siteKey = typeof body.site_key === "string" ? body.site_key : "";
  if (!siteKey) {
    return NextResponse.json({ error: "Missing site_key." }, { status: 400, headers: cors });
  }

  // The first-party Host identifies the site; site_key is verified against it.
  const host = req.headers.get("host");
  let site: AttributionSite | null;
  try {
    site = await resolveSite(host, siteKey);
  } catch (err) {
    console.error("attribution collect: resolveSite failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500, headers: cors });
  }
  if (!site) {
    return NextResponse.json({ error: "Unknown site." }, { status: 404, headers: cors });
  }
  if (!originAllowed(origin, site)) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403, headers: cors });
  }

  sweepExpired();
  const rl = rateLimit(`attr:${site.id}:${clientIp(req)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { ...cors, "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  // Visitor id precedence: the server cookie is authoritative (durable), then a
  // client-sent id, then a freshly minted one.
  const cookieVid = req.cookies.get(VID_COOKIE)?.value;
  const bodyVid = isValidUuid(body.visitor_id) ? body.visitor_id : null;
  const visitorId = (isValidUuid(cookieVid) && cookieVid) || bodyVid || randomUUID();

  const geo = {
    country: req.headers.get("x-vercel-ip-country"),
    region: req.headers.get("x-vercel-ip-country-region"),
  };

  const touches = normalizeTouches(body.touches).filter(hasSignal);
  const conversion = normalizeConversion(body.conversion);

  try {
    await upsertVisitor(site.id, visitorId, geo, null);
    if (touches.length) await insertTouches(site.id, visitorId, touches);
    if (conversion) await insertConversion(site.id, visitorId, null, conversion);
  } catch (err) {
    console.error("attribution collect: write failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500, headers: cors });
  }

  const res = new NextResponse(null, { status: 204, headers: cors });
  res.cookies.set(VID_COOKIE, visitorId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
