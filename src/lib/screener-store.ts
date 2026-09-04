import { createAdminClient } from "@/lib/supabase/admin";
import type { ScreenCondition } from "@/lib/indicators/screen";

// Server-side store for saved screener scans. Every query is scoped by user_id,
// so one account never sees or deletes another's saved scans.
export type ScreenerScan = {
  id: string;
  user_id: string;
  name: string;
  dimension: string;
  metric: string;
  conditions: string[];
  threshold_pct: number;
  within_days: number;
  min_volume: number;
  created_at: string;
};

const COLUMNS =
  "id, user_id, name, dimension, metric, conditions, threshold_pct, within_days, min_volume, created_at";

export async function listScans(userId: string): Promise<ScreenerScan[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("screener_scans")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ScreenerScan[]) ?? [];
}

export type NewScan = {
  name: string;
  dimension: string;
  metric: string;
  conditions: ScreenCondition[];
  threshold_pct: number;
  within_days: number;
  min_volume: number;
};

export async function createScan(userId: string, scan: NewScan): Promise<ScreenerScan> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("screener_scans")
    .insert({ user_id: userId, ...scan })
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return data as ScreenerScan;
}

// Delete one scan the caller owns; scoped by user_id so it is un-spoofable.
export async function deleteScan(userId: string, id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("screener_scans")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}
