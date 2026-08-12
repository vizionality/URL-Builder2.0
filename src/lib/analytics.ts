// Client-side conversion tracking. Everything here is a no-op until the
// matching NEXT_PUBLIC_* env vars are set, so nothing loads (and no cookies
// are set) until you actually configure a platform.
//
// Supported:
//   - Google (gtag.js): covers GA4 analytics and Google Ads conversions
//   - Meta Pixel: Facebook/Instagram ads
//
// Env vars:
//   NEXT_PUBLIC_GA_MEASUREMENT_ID     e.g. G-XXXXXXXXXX   (GA4)
//   NEXT_PUBLIC_GOOGLE_ADS_ID         e.g. AW-XXXXXXXXX   (Google Ads)
//   NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL  the conversion label for a sign-up
//   NEXT_PUBLIC_META_PIXEL_ID         e.g. 123456789012345

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";
export const GOOGLE_ADS_SIGNUP_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL ?? "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

export const HAS_GTAG = Boolean(GA_MEASUREMENT_ID || GOOGLE_ADS_ID);
export const HAS_META_PIXEL = Boolean(META_PIXEL_ID);
export const HAS_ANALYTICS = HAS_GTAG || HAS_META_PIXEL;

const GOOGLE_ADS_SIGNUP_SEND_TO =
  GOOGLE_ADS_ID && GOOGLE_ADS_SIGNUP_LABEL
    ? `${GOOGLE_ADS_ID}/${GOOGLE_ADS_SIGNUP_LABEL}`
    : "";

type GtagFn = (...args: unknown[]) => void;
type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    fbq?: FbqFn;
    dataLayer?: unknown[];
  }
}

/** Fire a generic analytics event across whatever platforms are configured. */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {}
): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
  if (typeof window.fbq === "function") {
    window.fbq("trackCustom", name, params);
  }
}

/** Fire the primary conversion: a completed sign-up. */
export function trackSignup(method: "email" | "google"): void {
  if (typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    window.gtag("event", "sign_up", { method });
    if (GOOGLE_ADS_SIGNUP_SEND_TO) {
      window.gtag("event", "conversion", {
        send_to: GOOGLE_ADS_SIGNUP_SEND_TO,
      });
    }
  }

  if (typeof window.fbq === "function") {
    window.fbq("track", "CompleteRegistration", { method });
  }
}
