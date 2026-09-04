import { NextRequest, NextResponse } from "next/server";
import { resolveSite } from "@/lib/attribution/sites";
import { linkIdentity } from "@/lib/attribution/store";
import { hashIdentity, isValidUuid } from "@/lib/attribution/payload";

// Deterministic cross-device merge: associate a visitor_id with a salted hash of
// an email when the same person identifies (for example, logs in) on a device.
// The raw email is never stored; only its hash. Public but keyed by site_key.
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
  const cors = corsHeaders(req.headers.get("origin"));

  const salt = process.env.ATTRIBUTION_SALT;
  if (!salt) {
    return NextResponse.json(
      { error: "Identity linking is not configured." },
      { status: 501, headers: cors }
    );
  }

  let body: { site_key?: unknown; visitor_id?: unknown; email?: unknown };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400, headers: cors });
  }

  const siteKey = typeof body.site_key === "string" ? body.site_key : "";
  const email = typeof body.email === "string" ? body.email : "";
  if (!siteKey || !isValidUuid(body.visitor_id) || !email.trim()) {
    return NextResponse.json(
      { error: "site_key, visitor_id and email are required." },
      { status: 400, headers: cors }
    );
  }

  let site;
  try {
    site = await resolveSite(req.headers.get("host"), siteKey);
    if (!site) site = await resolveSite(null, siteKey); // key-only fallback
  } catch (err) {
    console.error("attribution identify: resolveSite failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500, headers: cors });
  }
  if (!site) {
    return NextResponse.json({ error: "Unknown site." }, { status: 404, headers: cors });
  }

  try {
    await linkIdentity(site.id, body.visitor_id, hashIdentity(email, salt));
  } catch (err) {
    console.error("attribution identify: link failed:", err);
    return NextResponse.json({ error: "Server error." }, { status: 500, headers: cors });
  }

  return new NextResponse(null, { status: 204, headers: cors });
}
