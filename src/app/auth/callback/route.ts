import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const FAILURE = "Could not sign in with that provider.";

function backToSignIn(origin: string) {
  return NextResponse.redirect(
    `${origin}/sign-in?error=${encodeURIComponent(FAILURE)}`
  );
}

// Exchanges the OAuth/PKCE code for a session, then redirects into the app.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Google/Supabase surface denials as error params (not a code).
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");
  const nextParam = searchParams.get("next");
  // Only accept a same-origin relative path; reject absolute/protocol-relative
  // targets so `next` can't be used as an open redirect.
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/app";

  if (oauthError) {
    // The provider itself refused (denied consent, not a test user, etc.).
    console.error("OAuth callback returned an error:", oauthError);
    return backToSignIn(origin);
  }

  if (!code) {
    // No code and no error usually means the callback was hit directly or the
    // one-time code was already consumed (e.g. a refresh/back navigation).
    console.error("OAuth callback missing code param.");
    return backToSignIn(origin);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Log the real reason (invalid/used code, missing PKCE verifier, etc.) so
  // failures are diagnosable from the server logs instead of a generic string.
  console.error("exchangeCodeForSession failed:", error.message);
  return backToSignIn(origin);
}
