// A tiny in-browser cache of recent report responses, keyed by request URL.
// Flipping back to a filter combination you already looked at shows instantly
// instead of re-querying GA4 (and spending its quota). GA4 numbers don't move
// meaningfully within minutes, so a short lifetime is safe.

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 60;

const store = new Map<string, { at: number; value: unknown }>();

export function getCached<T>(key: string, now = Date.now()): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (now - hit.at > TTL_MS) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function setCached(key: string, value: unknown, now = Date.now()): void {
  store.delete(key); // re-insert so Map order tracks recency
  store.set(key, { at: now, value });
  // Evict the oldest entries past the cap (Map iterates in insertion order).
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value as string;
    store.delete(oldest);
  }
}

export function clearCache(): void {
  store.clear();
}
