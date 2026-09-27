import { getAppUser } from "@/lib/team";
// Read-only client portals: a share link (random token, optional password)
// that shows one client's dashboards without an account. Server-only.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientParam } from "@/lib/clients";

export type Share = {
  id: string;
  user_id: string;
  client_slug: string;
  token: string;
  password_hash: string | null;
  created_at: string;
  revoked_at: string | null;
};

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

export function checkPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const got = scryptSync(password, salt, 32);
  const want = Buffer.from(hash, "hex");
  return want.length === got.length && timingSafeEqual(got, want);
}

// Cookie proving the password was entered for this link (changes if the
// password changes).
export function unlockCookieName(share: Pick<Share, "id">): string {
  return `portal_${share.id.replace(/-/g, "")}`;
}
export function unlockCookieValue(share: Pick<Share, "token" | "password_hash">): string {
  return createHash("sha256").update(`${share.token}:${share.password_hash ?? ""}`).digest("hex");
}

export async function getShareByToken(token: string | null | undefined): Promise<Share | null> {
  if (!token || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const { data } = await createAdminClient()
    .from("client_shares")
    .select("*")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  return (data as Share) ?? null;
}

export async function isUnlocked(share: Share): Promise<boolean> {
  if (!share.password_hash) return true;
  const c = (await cookies()).get(unlockCookieName(share))?.value;
  return c === unlockCookieValue(share);
}

// Who a data request is for: the signed-in user and the client in the URL,
// or (read-only routes, `share=<token>`) the link's owner and client.
export async function requestUser(
  request: Request,
  { allowShare = false }: { allowShare?: boolean } = {}
): Promise<{ user: { id: string } | null; clientSlug: string | null; viaShare: boolean }> {
  const user = await getAppUser();
  const token = new URL(request.url).searchParams.get("share");
  if (allowShare && token) {
    const share = await getShareByToken(token);
    if (share && (await isUnlocked(share))) {
      return { user: { id: share.user_id }, clientSlug: share.client_slug, viaShare: true };
    }
    return { user: null, clientSlug: null, viaShare: true };
  }
  return { user: user ? { id: user.id } : null, clientSlug: clientParam(request), viaShare: false };
}
