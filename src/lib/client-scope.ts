// The client (agency mode) this browser tab is looking at, from the /c/<slug>/
// URL. api() tags every client-scoped API call with it, so the server reads
// that client's GA4 property and Search Console site, and cached responses
// never mix clients (the client is part of the URL).
import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { splitClientPath } from "@/lib/client-slug";

let current = "";
// Client portal link token: data calls go through the link instead of a login.
let portalToken = "";

export function setPortalToken(token: string): void {
  portalToken = token;
}
export function isPortal(): boolean {
  return Boolean(portalToken);
}
// The user's oldest client: it inherits builder data saved before clients existed.
let legacyOwner = "";
const LAST_KEY = "lastClient";

export function setCurrentClient(slug: string, isLegacyOwner = false): void {
  current = slug;
  if (isLegacyOwner) legacyOwner = slug;
  if (typeof document !== "undefined") {
    // Read by the old-URL redirects (/dashboard -> /c/<slug>/dashboard).
    document.cookie = `${LAST_KEY}=${slug}; path=/; max-age=31536000; samesite=lax`;
  }
}

// The tab's client: the one in the URL, else the last one set.
export function currentClient(): string {
  if (typeof window !== "undefined") {
    const { slug } = splitClientPath(window.location.pathname);
    if (slug) return slug;
  }
  return current;
}

export function api(path: string): string {
  if (portalToken) {
    const [base, query = ""] = path.split("?");
    const params = new URLSearchParams(query);
    params.set("share", portalToken);
    return `${base}?${params.toString()}`;
  }
  const slug = currentClient();
  if (!slug) return path;
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("client", slug);
  return `${base}?${params.toString()}`;
}

// A client-scoped page path, e.g. clientPath("/dashboard") -> "/c/acme/dashboard".
export function clientPath(path: string, slug: string = currentClient()): string {
  return slug ? `/c/${slug}${path}` : path;
}

// For links in components: prefixes paths with the client in the current URL
// (works during server rendering, unlike window-based clientPath).
export function useClientPath(): (path: string) => string {
  const { slug } = splitClientPath(usePathname());
  return useCallback((path: string) => (slug ? `/c/${slug}${path}` : path), [slug]);
}

export function isLegacyOwner(slug: string): boolean {
  return Boolean(slug) && slug === legacyOwner;
}

// Browser-storage key for this client's copy of `key` (unscoped outside a client).
export function clientStorageKey(key: string, slug: string): string {
  return slug ? `${key}@${slug}` : key;
}

// The client in the current URL (server-render safe).
export function useClientSlug(): string {
  return splitClientPath(usePathname()).slug ?? "";
}

// The last client this browser used (for pages outside /c/, e.g. importing a
// shared project), from the cookie setCurrentClient writes.
export function lastClient(): string {
  if (typeof document === "undefined") return "";
  return document.cookie.match(/(?:^|; )lastClient=([^;]+)/)?.[1] ?? "";
}
