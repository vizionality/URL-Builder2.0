// Connected Google logins (several per user in agency mode) and the user's plan.
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePlan, type Plan } from "@/lib/plans";

export type GoogleAccount = { id: string; email: string; refresh_token: string };

export async function listGoogleAccounts(userId: string): Promise<GoogleAccount[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("google_accounts")
    .select("id, email, refresh_token")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GoogleAccount[];
}

export async function getGoogleAccount(userId: string, id: string | null | undefined): Promise<GoogleAccount | null> {
  if (!id) return null;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("google_accounts")
    .select("id, email, refresh_token")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as GoogleAccount) ?? null;
}

// Add or refresh a login (same email updates its token).
export async function upsertGoogleAccount(userId: string, email: string, refreshToken: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("google_accounts")
    .upsert(
      { user_id: userId, email, refresh_token: refreshToken, updated_at: new Date().toISOString() },
      { onConflict: "user_id,email" }
    );
  if (error) throw error;
}

export async function getPlan(userId: string): Promise<Plan> {
  const admin = createAdminClient();
  const { data } = await admin.from("user_plans").select("plan").eq("user_id", userId).maybeSingle();
  return parsePlan(data?.plan);
}
