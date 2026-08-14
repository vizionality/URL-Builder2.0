// Client-side conversion tracking via Google Tag Manager.
//
// The app pushes semantic events to window.dataLayer; GTM (configured with the
// imported container) turns them into GA4 events and Google Ads conversions.
// Everything is a no-op until NEXT_PUBLIC_GTM_ID is set, so nothing loads and
// no cookies are set until GTM is actually configured.
//
// Env vars:
//   NEXT_PUBLIC_GTM_ID        e.g. GTM-XXXXXXX   (Google Tag Manager)
//   NEXT_PUBLIC_META_PIXEL_ID e.g. 123456789012345 (optional Meta Pixel)

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

export const HAS_GTM = Boolean(GTM_ID);
export const HAS_META_PIXEL = Boolean(META_PIXEL_ID);
export const HAS_ANALYTICS = HAS_GTM || HAS_META_PIXEL;

type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: FbqFn;
    dataLayer?: Record<string, unknown>[];
  }
}

/** Push a semantic event onto the GTM dataLayer (and Meta Pixel if present). */
export function trackEvent(
  event: string,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
  if (typeof window.fbq === "function") {
    window.fbq("trackCustom", event, params);
  }
}

/**
 * Primary conversion — a completed sign-up. Mirrored into GA4 and used to fire
 * the Google Ads sign-up conversion (with Enhanced Conversions) via GTM.
 */
export function trackAccountCreated(
  method: "email" | "google" | string,
  userId?: string
): void {
  trackEvent("account_created", { method, user_id: userId });
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", "CompleteRegistration", { method });
  }
}

/** Primary activation — the first time a signed-in user saves a UTM link. */
export function trackFirstUtmSaved(userId?: string): void {
  trackEvent("first_utm_saved", { user_id: userId });
}

/** Secondary — the homepage try-it widget produced a valid URL (anonymous). */
export function trackBuilderUsedNoSignup(): void {
  trackEvent("builder_used_no_signup");
}

/** Secondary — a bulk project was saved (strong team-tier predictor). */
export function trackBulkBuilderUsed(params: {
  userId?: string;
  projectId?: string;
  rowCount?: number;
}): void {
  trackEvent("bulk_builder_used", {
    user_id: params.userId,
    project_id: params.projectId,
    row_count: params.rowCount,
  });
}
