import { createClient } from "@/lib/supabase/client";
import { trackFirstUtmSaved } from "@/lib/analytics";

const LOCAL_FLAG = "utm.first_saved";

// Fires the "first_utm_saved" activation event the first time a signed-in user
// saves a UTM link, and never again. A localStorage flag is the fast path so we
// don't hit Supabase on every save; the authoritative dedupe lives on the
// account (user_metadata.first_utm_saved) so it holds across devices.
export async function trackFirstUtmSavedOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(LOCAL_FLAG) === "1") return;
  } catch {
    // ignore storage errors; fall through to the account check.
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const already = Boolean(user.user_metadata?.first_utm_saved);
  try {
    localStorage.setItem(LOCAL_FLAG, "1");
  } catch {
    // ignore
  }
  if (already) return;

  trackFirstUtmSaved(user.id);
  await supabase.auth
    .updateUser({ data: { first_utm_saved: true } })
    .catch(() => {});
}
