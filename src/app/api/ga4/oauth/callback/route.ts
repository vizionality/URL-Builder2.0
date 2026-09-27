import { getAppUser } from "@/lib/team";
import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCode,
  fetchUserEmail,
  oauthRedirectUri,
} from "@/lib/google-oauth";
import { saveGa4Token } from "@/lib/ga4-connection";
import { getPlan, listGoogleAccounts } from "@/lib/google-accounts";
import { canAddGoogleAccount } from "@/lib/plans";

// Handles the OAuth redirect: exchanges the code for a refresh token and stores it.
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("ga4_oauth_state")?.value;
  const returnCookie = req.cookies.get("ga4_oauth_return")?.value;
  const back = new URL(
    returnCookie === "clients-new"
      ? "/clients/new"
      : `/integrations/${returnCookie === "search-console" ? "search-console" : "google-analytics"}`,
    origin
  );
  const user = await getAppUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", origin));
  }

  function redirectBack() {
    const res = NextResponse.redirect(back);
    res.cookies.delete("ga4_oauth_state");
    res.cookies.delete("ga4_oauth_return");
    return res;
  }

  if (!code || !state || !cookieState || state !== cookieState) {
    back.searchParams.set("ga4", "error");
    return redirectBack();
  }

  try {
    const tokens = await exchangeCode(code, oauthRedirectUri(origin));
    if (!tokens.refresh_token) {
      // Google only returns a refresh token with prompt=consent; if missing,
      // the user likely denied or revoked access.
      back.searchParams.set("ga4", "norefresh");
      return redirectBack();
    }
    const email = await fetchUserEmail(tokens.access_token).catch(() => null);
    // Business plan: one Google login. Reconnecting the same one is fine.
    const [plan, accounts] = await Promise.all([getPlan(user.id), listGoogleAccounts(user.id).catch(() => [])]);
    if (!canAddGoogleAccount(plan, accounts.map((a) => a.email), email)) {
      back.searchParams.set("ga4", "plan_limit");
      return redirectBack();
    }
    await saveGa4Token(user.id, tokens.refresh_token, email);
    back.searchParams.set("ga4", "connected");
  } catch {
    back.searchParams.set("ga4", "error");
  }
  return redirectBack();
}
