// Date helpers for the indicator engine. All arithmetic is UTC so that adding 7
// days always lands on the same weekday, and a daylight-saving transition can
// never shift a day into a different ISO week.

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

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((isoToUtcMs(b) - isoToUtcMs(a)) / DAY_MS);
}

/** 0 = Sunday ... 6 = Saturday, in UTC. */
export function weekdayOf(iso: string): number {
  return new Date(isoToUtcMs(iso)).getUTCDay();
}

/** GA4 returns dates as "yyyymmdd"; normalize to ISO "yyyy-mm-dd". */
export function parseGa4Date(raw: string): string {
  if (!/^\d{8}$/.test(raw)) {
    throw new Error(`Invalid GA4 date "${raw}" (expected yyyymmdd).`);
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

/** ISO "yyyy-mm-dd" back to GA4 "yyyymmdd". */
export function toGa4Date(iso: string): string {
  return iso.replace(/-/g, "");
}

// ISO 8601 week: weeks start Monday, week 1 is the week containing the first
// Thursday of the year. Two functions matter for candles: the Monday a date
// belongs to, and a stable sortable week key.

/** The Monday (UTC) of the ISO week containing `iso`, as "yyyy-mm-dd". */
export function isoWeekMonday(iso: string): string {
  const wd = weekdayOf(iso); // 0=Sun..6=Sat
  // Days since Monday: Mon->0, Sun->6.
  const sinceMonday = (wd + 6) % 7;
  return addDays(iso, -sinceMonday);
}

/** Sortable ISO week key, e.g. "2026-W07". */
export function isoWeekKey(iso: string): string {
  // Anchor on the Thursday of this week: its calendar year is the ISO year.
  const thursday = addDays(isoWeekMonday(iso), 3);
  const isoYear = Number(thursday.slice(0, 4));
  // Week 1 is the week containing the first Thursday of the ISO year; find that
  // week's Thursday and count whole weeks from it.
  const firstThursday = addDays(isoWeekMonday(`${isoYear}-01-04`), 3);
  const week = Math.floor(daysBetween(firstThursday, thursday) / 7) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}
