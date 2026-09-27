// The client (agency mode) this browser tab is looking at, from the /c/<slug>/
// URL. api() tags every client-scoped API call with it, so the server reads
// that client's GA4 property and Search Console site, and cached responses
// never mix clients (the client is part of the URL).
import { usePathname } from "next/navigation";
import { splitClientPath } from "@/lib/client-slug";

let current = "";
const LAST_KEY = "lastClient";

export function setCurrentClient(slug: string): void {
  current = slug;
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
  return (path: string) => (slug ? `/c/${slug}${path}` : path);
}
