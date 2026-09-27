import { NextRequest, NextResponse } from "next/server";
import { checkPassword, getShareByToken, unlockCookieName, unlockCookieValue } from "@/lib/portal";
import { rateLimit, sweepExpired } from "@/lib/rate-limit";

// Password for a protected client portal link: sets a cookie that unlocks it.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  sweepExpired();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`portal-unlock:${ip}:${token}`, 10, 10 * 60_000).allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  const share = await getShareByToken(token);
  if (!share?.password_hash || !checkPassword(password, share.password_hash)) {
    return NextResponse.json({ error: "That password isn't right." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(unlockCookieName(share), unlockCookieValue(share), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
