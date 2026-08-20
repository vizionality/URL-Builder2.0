import { createAdminClient } from "@/lib/supabase/admin";
import type { BulkRow } from "@/lib/types";

export type SharedProject = {
  id: string;
  owner_id: string;
  name: string;
  data: { rows: BulkRow[] };
  created_at: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isShareId(value: string): boolean {
  return UUID_RE.test(value);
}

// Publishes a snapshot of one bulk project and returns its share id.
export async function createSharedProject(
  ownerId: string,
  name: string,
  rows: BulkRow[]
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shared_projects")
    .insert({ owner_id: ownerId, name, data: { rows } })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// Reads a published snapshot by id (null if not found / invalid id).
export async function getSharedProject(
  id: string
): Promise<SharedProject | null> {
  if (!isShareId(id)) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shared_projects")
    .select("id, owner_id, name, data, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as SharedProject) ?? null;
}

// Best-effort lookup of who shared it, for display only.
export async function getOwnerEmail(ownerId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(ownerId);
  if (error) return null;
  return data.user?.email ?? null;
}
