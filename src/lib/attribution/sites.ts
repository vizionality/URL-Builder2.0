import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// A tracked site. Server-side only: reads and writes go through the service role
// with an explicit user_id or site_key filter, matching the rest of the app.
export type AttributionSite = {
  id: string;
  user_id: string;
  name: string;
  site_key: string;
  collector_host: string | null;
  allowed_origins: string[];
  created_at: string;
};

// Public, unguessable token embedded in the client's GTM tag.
export function generateSiteKey(): string {
  return `sk_${randomBytes(24).toString("base64url")}`;
}

export async function listSites(userId: string): Promise<AttributionSite[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attribution_sites")
    .select("id, user_id, name, site_key, collector_host, allowed_origins, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as AttributionSite[]) ?? [];
}

export async function createSite(
  userId: string,
  name: string,
  collectorHost: string | null,
  allowedOrigins: string[]
): Promise<AttributionSite> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attribution_sites")
    .insert({
      user_id: userId,
      name,
      site_key: generateSiteKey(),
      collector_host: collectorHost,
      allowed_origins: allowedOrigins,
    })
    .select("id, user_id, name, site_key, collector_host, allowed_origins, created_at")
    .single();
  if (error) throw error;
  return data as AttributionSite;
}

// Update the mutable fields of a site the caller owns. Scoped by user_id so a
// client can never edit another account's site.
export async function updateSite(
  userId: string,
  siteId: string,
  patch: { name?: string; collector_host?: string | null; allowed_origins?: string[] }
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("attribution_sites")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", siteId);
  if (error) throw error;
}

// Resolve the site for an incoming collect request. The first-party Host is the
// primary key (that is what makes the cookie first-party); site_key is verified
// against it so a leaked host cannot be pointed at the wrong site.
export async function resolveSite(
  host: string | null,
  siteKey: string
): Promise<AttributionSite | null> {
  const admin = createAdminClient();
  let query = admin
    .from("attribution_sites")
    .select("id, user_id, name, site_key, collector_host, allowed_origins, created_at")
    .eq("site_key", siteKey);
  if (host) query = query.eq("collector_host", host);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data as AttributionSite) ?? null;
}
