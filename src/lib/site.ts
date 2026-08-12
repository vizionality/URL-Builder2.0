// Central site metadata used for SEO, sitemaps, and structured data.
//
// SITE_URL resolves in this order:
//   1. NEXT_PUBLIC_SITE_URL — set this once you point a custom domain at the app.
//   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel injects this automatically so the
//      production build always has a correct absolute URL.
//   3. localhost — for local development.
export const SITE_URL: string =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "UTMBuilder";

export const SITE_TAGLINE = "Campaign Tracker";

export const SITE_DESCRIPTION =
  "Build, standardize, and track UTM campaign URLs with real GA4 reporting.";

// Absolute URL helper for canonical links, sitemaps, and JSON-LD.
export function absoluteUrl(path = "/"): string {
  const base = SITE_URL.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
