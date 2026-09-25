// Pure helpers for the GA4 report page. No IO, so they are unit-testable.

// Percent change of current vs previous. Null when there is no baseline to
// compare against (previous is zero), so the UI can show a dash instead of a
// misleading infinity.
export function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

// Seconds -> "mm:ss" (GA4 averageSessionDuration is in seconds).
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

// Compact number like GA4 scorecards: 38723 -> "38.7K", 25200 -> "25.2K".
export function compact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

// GA4 "yearMonth" dimension ("202601") -> "Jan 2026".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatYearMonth(yyyymm: string): string {
  if (!/^\d{6}$/.test(yyyymm)) return yyyymm;
  const year = yyyymm.slice(0, 4);
  const month = Number(yyyymm.slice(4, 6));
  return `${MONTHS[month - 1] ?? "?"} ${year}`;
}

// The previous period of the same length ending the day before `startIso`.
export function previousPeriod(startIso: string, endIso: string): { start: string; end: string } {
  const day = 86_400_000;
  const s = Date.parse(`${startIso}T00:00:00Z`);
  const e = Date.parse(`${endIso}T00:00:00Z`);
  const lenDays = Math.round((e - s) / day) + 1;
  const prevEnd = s - day;
  const prevStart = prevEnd - (lenDays - 1) * day;
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { start: iso(prevStart), end: iso(prevEnd) };
}

// Shift an ISO date back one calendar year.
export function shiftYear(iso: string, years = -1): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y + years}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
