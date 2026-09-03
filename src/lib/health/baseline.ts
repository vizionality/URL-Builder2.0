// Baseline math and date helpers — pure, no globals.
//
// The core design decision: the baseline is the MEDIAN of the same weekday over
// the previous N weeks, not a trailing average. Traffic has strong weekly
// seasonality, so a trailing 7-day mean fires a false alert every weekend. A
// median over matched weekdays also survives one freak day in the window.
//
// All date arithmetic is done in UTC. Adding 7 days in UTC always lands on the
// same weekday, so a daylight-saving transition inside the baseline window
// cannot shift which weekday a baseline date falls on.

export function median(values: number[]): number {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return NaN;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

/** Signed percent change of observed vs. baseline. */
export function pctChange(observed: number, baseline: number): number {
  if (baseline === 0) return observed === 0 ? 0 : Infinity;
  return ((observed - baseline) / baseline) * 100;
}

/** GA4 returns dates as "yyyymmdd"; normalize to ISO "yyyy-mm-dd". */
export function parseGa4Date(raw: string): string {
  if (!/^\d{8}$/.test(raw)) {
    throw new Error(`Invalid GA4 date "${raw}" (expected yyyymmdd).`);
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

/** ISO "yyyy-mm-dd" back to GA4 "yyyymmdd" (for building requests). */
export function toGa4Date(iso: string): string {
  return iso.replace(/-/g, "");
}

function isoToUtcMs(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Invalid ISO date "${iso}" (expected yyyy-mm-dd).`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function utcMsToIso(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

const DAY_MS = 86_400_000;

export function addDays(iso: string, n: number): string {
  return utcMsToIso(isoToUtcMs(iso) + n * DAY_MS);
}

/** 0 = Sunday … 6 = Saturday, in UTC. */
export function weekdayOf(iso: string): number {
  return new Date(isoToUtcMs(iso)).getUTCDay();
}

/** The day to check: today minus lag (GA4 keeps adjusting the most recent days). */
export function targetDate(todayIso: string, lagDays: number): string {
  return addDays(todayIso, -lagDays);
}

/** The same weekday for each of the previous `weeks` weeks (excludes target). */
export function baselineDates(targetIso: string, weeks: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= weeks; i++) out.push(addDays(targetIso, -7 * i));
  return out;
}

/** Earliest date to fetch so one request covers the whole baseline window. */
export function windowStart(targetIso: string, weeks: number): string {
  return addDays(targetIso, -7 * weeks);
}
