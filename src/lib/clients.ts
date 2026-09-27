// Server-side client (agency) records. Each client has its own GA4 property
// and Search Console site; the Google login stays in ga4_connections.
import { createAdminClient } from "@/lib/supabase/admin";
import { isSlug, uniqueSlug } from "@/lib/client-slug";
import { canSeeClient } from "@/lib/roles";
import { getAppUser } from "@/lib/team";

// A team member limited to some clients only sees those (when the request is
// theirs; portal links and background reads pass through).
async function allowedFor(userId: string): Promise<string[] | null> {
  const me = await getAppUser().catch(() => null);
  return me && me.id === userId ? me.clients : null;
}

export type ClientRecord = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  property_id: string | null;
  property_name: string | null;
  gsc_site_url: string | null;
  // The Google logins the property and the Search Console site come from.
  google_account_id: string | null;
  gsc_google_account_id: string | null;
};

const COLUMNS = "id, slug, name, domain, property_id, property_name, gsc_site_url, google_account_id, gsc_google_account_id";
type ClientFields = Partial<
  Pick<ClientRecord, "name" | "domain" | "property_id" | "property_name" | "gsc_site_url" | "google_account_id" | "gsc_google_account_id">
>;

// The user's clients, oldest first. A user with none gets one, seeded from
// their current GA4 / Search Console selection, so client URLs always work.
export async function listClients(userId: string): Promise<ClientRecord[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (data && data.length > 0) {
    const allowed = await allowedFor(userId);
    return (data as ClientRecord[]).filter((c) => canSeeClient(allowed, c.slug));
  }
  const { data: conn } = await admin
    .from("ga4_connections")
    .select("property_id, property_name, gsc_site_url")
    .eq("user_id", userId)
    .maybeSingle();
  const name = (conn?.property_name as string | null) || "My client";
  const { data: account } = await admin
    .from("google_accounts")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const first = await createClientRecord(userId, name, {
    google_account_id: (account?.id as string | undefined) ?? null,
    gsc_google_account_id: (account?.id as string | undefined) ?? null,
    property_id: (conn?.property_id as string | null) ?? null,
    property_name: (conn?.property_name as string | null) ?? null,
    gsc_site_url: (conn?.gsc_site_url as string | null) ?? null,
  });
  return [first];
}

export async function getClientBySlug(userId: string, slug: string | null | undefined): Promise<ClientRecord | null> {
  if (!isSlug(slug)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const allowed = await allowedFor(userId);
  return canSeeClient(allowed, slug) ? (data as ClientRecord) : null;
}

export async function createClientRecord(
  userId: string,
  name: string,
  fields: Omit<ClientFields, "name"> = {}
): Promise<ClientRecord> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("clients").select("slug").eq("user_id", userId);
  const slug = uniqueSlug(name, (existing ?? []).map((r) => r.slug as string));
  const { data, error } = await admin
    .from("clients")
    .insert({ user_id: userId, slug, name: name.trim().slice(0, 80) || "Client", ...fields })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as ClientRecord;
}

export async function updateClient(
  userId: string,
  slug: string,
  fields: ClientFields
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slug", slug);
  if (error) throw error;
}

// The client named by a request's `client` query param (set by the browser's
// api() helper on every client-scoped call).
export function clientParam(request: Request): string | null {
  return new URL(request.url).searchParams.get("client");
}
