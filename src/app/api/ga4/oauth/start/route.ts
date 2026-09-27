import { forbidUnless, getAppUser } from "@/lib/team";
import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl, oauthRedirectUri } from "@/lib/google-oauth";

// Kicks off the Google OAuth consent flow.
export async function GET(req: NextRequest) {
  // Team roles: needs at least admin.
  const me = await getAppUser();
  const denied = me ? forbidUnless(me, "admin") : null;
  if (denied) return denied;
  const origin = req.nextUrl.origin;
  const user = await getAppUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", origin));
  }

  const state = crypto.randomUUID();
  const authUrl = buildAuthUrl(oauthRedirectUri(origin), state);

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("ga4_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  // Where to land afterwards: an integration's setup page.
  const back = req.nextUrl.searchParams.get("return");
  if (back === "search-console" || back === "google-analytics" || back === "clients-new") {
    res.cookies.set("ga4_oauth_return", back, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  }
  return res;
}
