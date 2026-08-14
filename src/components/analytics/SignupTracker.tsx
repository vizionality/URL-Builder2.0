"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { trackAccountCreated } from "@/lib/analytics";

// Fires the primary "account_created" conversion exactly once per account, on
// the user's first authenticated page load. Doing it here (rather than at the
// sign-up call site) covers email and Google uniformly and survives the
// email-confirmation round-trip. Dedupe is stored on the account itself
// (user_metadata.signup_tracked) so it can't double-fire across devices.
export function SignupTracker({
  tracked,
  method,
  userId,
}: {
  tracked: boolean;
  method: string;
  userId: string;
}) {
  useEffect(() => {
    if (tracked) return;
    let cancelled = false;
    // Defer so the state update / GTM load settle before we push.
    Promise.resolve().then(async () => {
      if (cancelled) return;
      trackAccountCreated(method, userId);
      // Persist the flag so it never fires again for this account.
      await createClient()
        .auth.updateUser({ data: { signup_tracked: true } })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [tracked, method, userId]);

  return null;
}
