// Server-side Search Console API calls, using the user's Google connection.
import type { GscRow } from "@/lib/gsc-report";

const BASE = "https://searchconsole.googleapis.com/webmasters/v3";

// Thrown when the stored token lacks the Search Console scope (connected before
// it was added) or the API is off: the user needs to reconnect Google.
export class GscAccessError extends Error {}

async function call<T>(token: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    const text = await res.text();
    console.error("Search Console access denied:", res.status, text);
    throw new GscAccessError(
      /insufficient|scope/i.test(text)
        ? "Reconnect Google on the Integrations page to grant Search Console access."
        : /has not been used|disabled/i.test(text)
          ? `The Search Console API isn't enabled for this app's Google Cloud project${
              text.match(/project (\d+)/)?.[1] ? ` (project number ${text.match(/project (\d+)/)![1]})` : ""
            }. Enable it at https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview${
              text.match(/project (\d+)/)?.[1] ? `?project=${text.match(/project (\d+)/)![1]}` : ""
            }`
          : "This Google account can't access that Search Console site."
    );
  }
  if (!res.ok) throw new Error(`Search Console request failed (${res.status}): ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function listSites(token: string): Promise<{ siteUrl: string; permissionLevel: string }[]> {
  const d = await call<{ siteEntry?: { siteUrl: string; permissionLevel: string }[] }>(token, "/sites");
  return (d.siteEntry ?? []).filter((s) => s.permissionLevel !== "siteUnverifiedUser");
}

export type GscQuery = {
  startDate: string;
  endDate: string;
  dimensions?: ("date" | "query" | "page" | "country" | "device")[];
  rowLimit?: number;
};

export async function searchAnalytics(token: string, siteUrl: string, q: GscQuery): Promise<GscRow[]> {
  const d = await call<{ rows?: GscRow[] }>(
    token,
    `/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    { ...q, dataState: "all" }
  );
  return d.rows ?? [];
}
