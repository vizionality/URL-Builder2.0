import { createClient } from "@supabase/supabase-js";

// Server-only: bypasses RLS via the service-role key. Never import from a
// client component, and only use for trusted server-side operations (e.g.
// the Stripe webhook updating a workspace's plan).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin client is not configured.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
