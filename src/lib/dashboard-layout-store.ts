import { createAdminClient } from "@/lib/supabase/admin";

// Server-side store for dashboard layouts, one row per user + GA4 property.
// Every query is scoped by user_id, so one account never reads or writes
// another's layout.

// The saved widget ids, or null when this user hasn't customized yet.
export async function getLayout(userId: string, propertyId: string): Promise<string[] | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dashboard_layouts")
    .select("widgets")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .maybeSingle();
  if (error) throw error;
  return (data?.widgets as string[] | undefined) ?? null;
}

export async function saveLayout(userId: string, propertyId: string, widgets: string[]): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("dashboard_layouts")
    .upsert(
      { user_id: userId, property_id: propertyId, widgets, updated_at: new Date().toISOString() },
      { onConflict: "user_id,property_id" }
    );
  if (error) throw error;
}

// Back to the default layout.
export async function resetLayout(userId: string, propertyId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("dashboard_layouts")
    .delete()
    .eq("user_id", userId)
    .eq("property_id", propertyId);
  if (error) throw error;
}
