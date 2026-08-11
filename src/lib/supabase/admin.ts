import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service-role key. Bypasses RLS, so it
// must never be imported into client components. Used to read/write the
// ga4_connections table (which holds refresh tokens clients cannot access).
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
