// Bot filter rules per client (server-only): what every GA4 report leaves out.
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientBySlug } from "@/lib/clients";
import type { BotDimension } from "@/lib/bot-signals";
import type { PageFilters } from "@/lib/ga4-filters";

export type BotRule = { id: string; dimension: BotDimension; value: string; created_by: string | null; created_at: string };

export const BOT_DIMENSIONS: BotDimension[] = ["country", "city", "sourceMedium", "browser", "screenResolution", "landingPage"];

// The GA4 field each rule's dimension filters on.
export const GA4_FIELD: Record<BotDimension, string> = {
  country: "country",
  city: "city",
  sourceMedium: "sessionSourceMedium",
  browser: "browser",
  screenResolution: "screenResolution",
  landingPage: "landingPage",
};

export async function listBotRules(userId: string, slug: string): Promise<BotRule[]> {
  const { data, error } = await createAdminClient()
    .from("bot_filters")
    .select("id, dimension, value, created_by, created_at")
    .eq("user_id", userId)
    .eq("client_slug", slug)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BotRule[];
}

// Adds the client's bot filter to a report's filters (no-op outside a client,
// when switched off, or before the migration has run).
export async function applyBotFilter(filters: PageFilters, userId: string, slug: string | null): Promise<void> {
  if (!slug || filters.noBots) return;
  try {
    const client = await getClientBySlug(userId, slug);
    if (!client || client.bot_filter_enabled === false) return;
    const rules = await listBotRules(userId, client.slug);
    const exclude: Record<string, string[]> = {};
    for (const r of rules) (exclude[GA4_FIELD[r.dimension]] ??= []).push(r.value);
    filters.exclude = exclude;
  } catch {
    // Table missing or a DB hiccup: report unfiltered rather than fail.
  }
}
