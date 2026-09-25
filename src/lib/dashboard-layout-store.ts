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

// ---- Version history -----------------------------------------------------------

export type LayoutVersion = { id: string; widgets: string[]; created_at: string; updated_at: string };

// Edits within this window update the latest snapshot instead of adding one,
// so a burst of drags and resizes is one version.
export const VERSION_COALESCE_MS = 10 * 60 * 1000;
export const MAX_VERSIONS = 30;

export async function listVersions(userId: string, propertyId: string): Promise<LayoutVersion[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dashboard_layout_versions")
    .select("id, widgets, created_at, updated_at")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .order("updated_at", { ascending: false })
    .limit(MAX_VERSIONS);
  if (error) throw error;
  return (data as LayoutVersion[]) ?? [];
}

// Record `widgets` as the newest version. `previous` is the layout before this
// change; with no history yet it's stored first, so the starting point can be
// restored too.
export async function recordVersion(
  userId: string,
  propertyId: string,
  widgets: string[],
  previous: string[],
  { now = Date.now(), forceNew = false }: { now?: number; forceNew?: boolean } = {}
): Promise<void> {
  const admin = createAdminClient();
  const table = admin.from("dashboard_layout_versions");
  const versions = await listVersions(userId, propertyId);
  const latest = versions[0];
  const stamp = new Date(now).toISOString();

  // A restore always gets its own version, so the layout it replaced stays restorable.
  if (!forceNew && latest && now - Date.parse(latest.updated_at) < VERSION_COALESCE_MS) {
    const { error } = await table.update({ widgets, updated_at: stamp }).eq("id", latest.id).eq("user_id", userId);
    if (error) throw error;
    return;
  }
  if (!latest) {
    // Baseline a little earlier, so it sorts before the change it preceded.
    const before = new Date(now - 1000).toISOString();
    const { error } = await table.insert({
      user_id: userId, property_id: propertyId, widgets: previous, created_at: before, updated_at: before,
    });
    if (error) throw error;
  }
  const { error } = await table.insert({
    user_id: userId, property_id: propertyId, widgets, created_at: stamp, updated_at: stamp,
  });
  if (error) throw error;

  // Keep only the newest MAX_VERSIONS.
  const all = await listVersionIds(userId, propertyId);
  const extra = all.slice(MAX_VERSIONS);
  if (extra.length) {
    const { error: delError } = await admin
      .from("dashboard_layout_versions")
      .delete()
      .eq("user_id", userId)
      .in("id", extra);
    if (delError) throw delError;
  }
}

async function listVersionIds(userId: string, propertyId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dashboard_layout_versions")
    .select("id")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data as { id: string }[]) ?? []).map((r) => r.id);
}
