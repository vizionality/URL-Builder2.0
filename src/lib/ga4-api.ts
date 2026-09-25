// Shared GA4 Data API plumbing for the Dashboard routes.
//
// GA4 limits each property to about 10 concurrent requests (plus hourly and
// daily token budgets). A Dashboard load fires a dozen reports and a filter
// change fires another dozen while the first may still be running, so these
// helpers keep us under the limit: run reports a few at a time, retry the
// "too many requests" answers with backoff, stop work when the browser has
// moved on, and turn failures into a message that says what went wrong without
// echoing GA4's raw response to the client.

const DATA_API = "https://analyticsdata.googleapis.com/v1beta";

export type RawRow = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };

export class Ga4Error extends Error {
  constructor(public status: number, public detail: string) {
    super(`GA4 runReport ${status}: ${detail}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Retry `fn` while `shouldRetry(err)` says the failure is transient, waiting
// `delays[i]` before attempt i+1. Pure apart from the sleep, so it is testable.
export async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (err: unknown) => boolean,
  delays: number[] = [600, 1800]
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= delays.length || !shouldRetry(err)) throw err;
      await sleep(delays[attempt]);
    }
  }
}

// 429 = quota / too many concurrent requests; 503 = GA4 briefly unavailable.
export const isTransient = (err: unknown) =>
  err instanceof Ga4Error && (err.status === 429 || err.status === 503);

export async function runReport(
  propertyId: string,
  token: string,
  body: unknown,
  signal?: AbortSignal
): Promise<RawRow[]> {
  return withRetry(async () => {
    const res = await fetch(`${DATA_API}/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Ga4Error(res.status, await res.text());
    const data = await res.json();
    return (data.rows ?? []) as RawRow[];
  }, isTransient);
}

// GA4 runs up to 5 reports in one batchRunReports call, and a batch counts as
// ONE request toward the ~10-concurrent limit. So batching is both faster (one
// round trip instead of several) and gentler on quota than separate calls.
export const MAX_BATCH = 5;

// Split into chunks of `size`, preserving order.
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Run many report bodies as batches (5 per call, up to `parallel` batches at
// once). Returns one row list per body, in the same order as `bodies`.
export async function batchRunReports(
  propertyId: string,
  token: string,
  bodies: unknown[],
  signal?: AbortSignal,
  parallel = 2
): Promise<RawRow[][]> {
  if (bodies.length === 0) return [];
  const batches = chunk(bodies, MAX_BATCH);
  const results = await limitAll(
    batches.map((requests) => () =>
      withRetry(async () => {
        const res = await fetch(`${DATA_API}/properties/${propertyId}:batchRunReports`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({ requests }),
          signal,
        });
        if (!res.ok) throw new Ga4Error(res.status, await res.text());
        const data = await res.json();
        const reports = (data.reports ?? []) as { rows?: RawRow[] }[];
        // Index by position so a missing report can never shift later results.
        return requests.map((_, i) => reports[i]?.rows ?? []);
      }, isTransient)
    ),
    parallel
  );
  return results.flat();
}

// Which conversions metric a property accepts never changes, so remember it
// per property (per warm server instance) instead of probing GA4 every load.
const keyMetricCache = new Map<string, string>();

// GA4 renamed `conversions` to `keyEvents`; use whichever the property accepts.
export async function detectKeyMetric(propertyId: string, token: string, signal?: AbortSignal): Promise<string> {
  const cached = keyMetricCache.get(propertyId);
  if (cached) return cached;
  for (const name of ["keyEvents", "conversions"]) {
    try {
      const res = await fetch(`${DATA_API}/properties/${propertyId}:runReport`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "yesterday" }],
          metrics: [{ name }],
        }),
        signal,
      });
      if (res.ok) {
        keyMetricCache.set(propertyId, name); // only cache a real answer
        return name;
      }
    } catch {
      // try next
    }
  }
  return "keyEvents";
}

// Run async tasks at most `limit` at a time, returning results in task order.
// After the first failure no new tasks start (they would only burn quota).
export async function limitAll<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  let failed = false;
  async function worker() {
    while (!failed && next < tasks.length) {
      const i = next++;
      try {
        results[i] = await tasks[i]();
      } catch (err) {
        failed = true;
        throw err;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

// A user-facing message for a failed report: which kind of failure, never
// GA4's raw response text (that goes to the server log only).
export function ga4FailureMessage(err: unknown): string {
  if (err instanceof Ga4Error) {
    if (err.status === 429) {
      return "Google Analytics is rate-limiting this property (too many requests). Wait a minute and try again.";
    }
    if (err.status === 403) return "Google Analytics denied access to this property. Check the connected account's access.";
    if (err.status === 400) return "Google Analytics couldn't run this report with the selected filters.";
    if (err.status >= 500) return "Google Analytics is temporarily unavailable. Try again shortly.";
  }
  return "GA4 report failed. Try again shortly.";
}

// GA4 metric names for every switchable breakdown metric, in BREAKDOWN_METRICS
// order, with key events resolved to the property's own name.
export const BREAKDOWN_METRIC_IDS = ["totalUsers", "newUsers", "sessions", "engagedSessions", "keyEvents"] as const;
export function breakdownMetricNames(keyMetric: string): { name: string }[] {
  return BREAKDOWN_METRIC_IDS.map((id) => ({ name: id === "keyEvents" ? keyMetric : id }));
}
// Read a row's metric values back into { totalUsers, ..., keyEvents }.
export function rowMetricValues(r: RawRow): Record<(typeof BREAKDOWN_METRIC_IDS)[number], number> {
  const out = {} as Record<(typeof BREAKDOWN_METRIC_IDS)[number], number>;
  BREAKDOWN_METRIC_IDS.forEach((id, i) => (out[id] = Number(r.metricValues?.[i]?.value ?? 0)));
  return out;
}

// Events currently marked as key events in GA4 Admin, cached per property for
// a few minutes. GA4's keyEvents metric counts an event on every day it was
// marked, so an event unmarked mid-range still shows up; this list is what
// the property treats as a key event today. Null when the Admin API can't be
// read (the caller then shows GA4's counts unfiltered).
const KEY_EVENTS_TTL_MS = 10 * 60 * 1000;
const keyEventsCache = new Map<string, { at: number; names: Set<string> }>();

export async function currentKeyEvents(
  propertyId: string,
  token: string,
  signal?: AbortSignal,
  now = Date.now()
): Promise<Set<string> | null> {
  const hit = keyEventsCache.get(propertyId);
  if (hit && now - hit.at < KEY_EVENTS_TTL_MS) return hit.names;
  try {
    const names = new Set<string>();
    let pageToken = "";
    do {
      const url = new URL(`https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/keyEvents`);
      url.searchParams.set("pageSize", "200");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal });
      if (!res.ok) return null;
      const data = (await res.json()) as { keyEvents?: { eventName?: string }[]; nextPageToken?: string };
      for (const k of data.keyEvents ?? []) if (k.eventName) names.add(k.eventName);
      pageToken = data.nextPageToken ?? "";
    } while (pageToken);
    keyEventsCache.set(propertyId, { at: now, names });
    return names;
  } catch {
    return null;
  }
}

export function clearKeyEventsCache(): void {
  keyEventsCache.clear();
}
