// Health flags and headline numbers for the Clients overview. Pure and
// unit-tested; the route gathers the inputs.

export type Metric = { current: number; previous: number };

export type HealthInput = {
  hasProperty: boolean;
  hasSite: boolean;
  googleError: boolean;
  keyEventCount: number | null; // null: couldn't read
  sessions: Metric | null;
  gscError: boolean;
};

export type Flag = { id: string; level: "error" | "warn"; text: string };

export function healthFlags(h: HealthInput): Flag[] {
  const flags: Flag[] = [];
  if (h.googleError) flags.push({ id: "google", level: "error", text: "Google access expired. Reconnect Google." });
  if (!h.hasProperty) flags.push({ id: "ga4", level: "error", text: "No GA4 property selected." });
  if (h.hasProperty && !h.googleError && h.keyEventCount === 0) {
    flags.push({ id: "keyEvents", level: "warn", text: "No key events marked, so no conversions are tracked." });
  }
  if (h.hasProperty && h.sessions && h.sessions.current === 0) {
    flags.push({ id: "noTraffic", level: "warn", text: "No sessions in the last 28 days. Check the GA4 tag." });
  }
  if (!h.hasSite) flags.push({ id: "gsc", level: "warn", text: "Search Console not connected." });
  if (h.hasSite && h.gscError) flags.push({ id: "gscError", level: "warn", text: "Search Console couldn't be read." });
  return flags;
}

// Percent change, null without a previous value.
export function change(m: Metric | null): number | null {
  if (!m || !m.previous) return null;
  return ((m.current - m.previous) / m.previous) * 100;
}

// The window the overview uses: the 28 days before today, and the 28 before those.
export function last28(todayIso: string): { start: string; end: string; prevStart: string; prevEnd: string } {
  const day = 86_400_000;
  const t = Date.parse(`${todayIso}T00:00:00Z`);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { start: iso(t - 28 * day), end: iso(t - day), prevStart: iso(t - 56 * day), prevEnd: iso(t - 29 * day) };
}
