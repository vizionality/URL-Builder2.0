import { createAdminClient } from "@/lib/supabase/admin";
import { getClientBySlug, updateClient } from "@/lib/clients";
import { getGoogleAccount, listGoogleAccounts, upsertGoogleAccount } from "@/lib/google-accounts";

export type Ga4Connection = {
  user_id: string;
  refresh_token: string;
  email: string | null;
  property_id: string | null;
  property_name: string | null;
  gsc_site_url: string | null;
  // Token for Search Console when the client's site is under another Google login.
  gsc_refresh_token?: string;
};

// The user's Google connection. With a client slug, the property and Search
// Console site are that client's (null if the slug isn't one of theirs), read
// with the Google logins the client points at.
export async function getGa4Connection(
  userId: string,
  clientSlug?: string | null
): Promise<Ga4Connection | null> {
  const conn = await readConnection(userId);
  if (!clientSlug) return conn;
  const client = await getClientBySlug(userId, clientSlug).catch(() => null);
  const [account, gscAccount] = await Promise.all([
    getGoogleAccount(userId, client?.google_account_id).catch(() => null),
    getGoogleAccount(userId, client?.gsc_google_account_id).catch(() => null),
  ]);
  const base = conn ?? (account ? emptyConnection(userId) : null);
  if (!base) return null;
  const token = account?.refresh_token ?? base.refresh_token;
  return {
    ...base,
    refresh_token: token,
    email: account?.email ?? base.email,
    property_id: client?.property_id ?? null,
    property_name: client?.property_name ?? null,
    gsc_site_url: client?.gsc_site_url ?? null,
    gsc_refresh_token: gscAccount?.refresh_token ?? token,
  };
}

function emptyConnection(userId: string): Ga4Connection {
  return { user_id: userId, refresh_token: "", email: null, property_id: null, property_name: null, gsc_site_url: null };
}

async function readConnection(userId: string): Promise<Ga4Connection | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ga4_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as Ga4Connection;
  // No default login row: fall back to the first connected Google account.
  const [first] = await listGoogleAccounts(userId).catch(() => []);
  return first ? { ...emptyConnection(userId), refresh_token: first.refresh_token, email: first.email } : null;
}

export async function saveGa4Token(
  userId: string,
  refreshToken: string,
  email: string | null
): Promise<void> {
  if (email) await upsertGoogleAccount(userId, email, refreshToken).catch((e) => console.error("google_accounts upsert:", e));
  const admin = createAdminClient();
  // Another Google login than the default one: it is only added to
  // google_accounts, so existing clients keep reading with their own login.
  const { data: existing } = await admin.from("ga4_connections").select("email").eq("user_id", userId).maybeSingle();
  if (existing && email && existing.email && existing.email !== email) return;
  const { error } = await admin.from("ga4_connections").upsert(
    {
      user_id: userId,
      refresh_token: refreshToken,
      email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function setGa4Property(
  userId: string,
  propertyId: string,
  propertyName: string | null,
  clientSlug?: string | null
): Promise<void> {
  if (clientSlug) return updateClient(userId, clientSlug, { property_id: propertyId, property_name: propertyName });
  const admin = createAdminClient();
  const { error } = await admin
    .from("ga4_connections")
    .update({
      property_id: propertyId,
      property_name: propertyName,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteGa4Connection(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("ga4_connections")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

// The Search Console site shown on the SEO Dashboard (e.g. "sc-domain:example.com").
export async function setGscSite(userId: string, siteUrl: string | null, clientSlug?: string | null): Promise<void> {
  if (clientSlug) return updateClient(userId, clientSlug, { gsc_site_url: siteUrl });
  const admin = createAdminClient();
  const { error } = await admin
    .from("ga4_connections")
    .update({ gsc_site_url: siteUrl, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}
