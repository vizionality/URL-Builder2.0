// Google OAuth helpers for per-user Google Analytics access.
// Uses the OAuth 2.0 web-server flow with plain fetch (no SDK).

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  // Search Console (SEO Dashboard). Accounts connected before this was added
  // reconnect once to grant it.
  "https://www.googleapis.com/auth/webmasters.readonly",
  // Creating the GA4 -> BigQuery export link changes GA4 settings.
  "https://www.googleapis.com/auth/analytics.edit",
  "openid",
  "email",
];

export function oauthRedirectUri(origin: string): string {
  return (
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${origin}/api/ga4/oauth/callback`
  );
}

function clientId(): string {
  const v = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!v) throw new Error("GOOGLE_OAUTH_CLIENT_ID is not set.");
  return v;
}

function clientSecret(): string {
  const v = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!v) throw new Error("GOOGLE_OAUTH_CLIENT_SECRET is not set.");
  return v;
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // force a refresh_token every time
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
};

export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

// Access tokens live about an hour, so reuse one until shortly before it
// expires instead of calling Google's token endpoint on every request. Kept in
// server memory only (per warm instance), keyed by the refresh token.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();
const EXPIRY_MARGIN_MS = 2 * 60 * 1000;

export async function getAccessToken(refreshToken: string): Promise<string> {
  const cached = tokenCache.get(refreshToken);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    tokenCache.delete(refreshToken);
    throw new Error(`Token refresh failed: ${await res.text()}`);
  }
  const data = await res.json();
  const token = data.access_token as string;
  const lifetimeMs = Number(data.expires_in ?? 3600) * 1000;
  tokenCache.set(refreshToken, { token, expiresAt: Date.now() + lifetimeMs - EXPIRY_MARGIN_MS });
  return token;
}

export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.email as string) ?? null;
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(
    `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    }
  ).catch(() => {});
}
