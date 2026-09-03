// Persistence for fired change-point signals. The engine computes signals fresh
// from GA4 on every read; this table exists only to remember which ones a user
// has acknowledged, so an acknowledged signal does not keep nagging. Every query
// filters by BOTH user_id and property_id, so one user's data can never leak
// into another's, and switching properties never mixes histories.

import { createAdminClient } from "@/lib/supabase/admin";
import type { Signal } from "./types";

export type StoredSignal = {
  metric: string;
  direction: string;
  fired_on: string;
  acknowledged_at: string | null;
};

const SCOPE = "site";
const SCOPE_KEY = "";

/** Upsert freshly computed signals; existing rows keep their acknowledged_at. */
export async function persistSignals(
  userId: string,
  propertyId: string,
  metric: string,
  signals: Signal[]
): Promise<void> {
  if (signals.length === 0) return;
  const admin = createAdminClient();
  const rows = signals.map((s) => ({
    user_id: userId,
    property_id: propertyId,
    metric,
    scope: SCOPE,
    scope_key: SCOPE_KEY,
    direction: s.direction,
    fired_on: s.date,
    cusum_value: s.cusumValue ?? null,
    baseline_mean: s.baselineMean ?? null,
    baseline_sd: s.baselineSd ?? null,
  }));
  // ignoreDuplicates keeps any prior acknowledged_at instead of clobbering it.
  const { error } = await admin.from("indicator_signals").upsert(rows, {
    onConflict: "user_id,property_id,metric,scope,scope_key,direction,fired_on",
    ignoreDuplicates: true,
  });
  if (error) throw error;
}

/** All stored signals for one user+property+metric, for acknowledged status. */
export async function loadSignals(
  userId: string,
  propertyId: string,
  metric: string
): Promise<StoredSignal[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("indicator_signals")
    .select("metric, direction, fired_on, acknowledged_at")
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .eq("metric", metric);
  if (error) throw error;
  return (data as StoredSignal[]) ?? [];
}

/** Mark one signal acknowledged. Scoped by user+property so it is un-spoofable. */
export async function acknowledgeSignal(
  userId: string,
  propertyId: string,
  metric: string,
  direction: string,
  firedOn: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("indicator_signals")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("property_id", propertyId)
    .eq("metric", metric)
    .eq("scope", SCOPE)
    .eq("scope_key", SCOPE_KEY)
    .eq("direction", direction)
    .eq("fired_on", firedOn);
  if (error) throw error;
}
