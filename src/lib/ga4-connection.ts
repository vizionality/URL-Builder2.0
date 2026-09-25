import { createAdminClient } from "@/lib/supabase/admin";

export type Ga4Connection = {
  user_id: string;
  refresh_token: string;
  email: string | null;
  property_id: string | null;
  property_name: string | null;
  gsc_site_url: string | null;
};

export async function getGa4Connection(
  userId: string
): Promise<Ga4Connection | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ga4_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Ga4Connection) ?? null;
}

export async function saveGa4Token(
  userId: string,
  refreshToken: string,
  email: string | null
): Promise<void> {
  const admin = createAdminClient();
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
  propertyName: string | null
): Promise<void> {
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
export async function setGscSite(userId: string, siteUrl: string | null): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("ga4_connections")
    .update({ gsc_site_url: siteUrl, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw error;
}
