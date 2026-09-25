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

// Choropleth fill: interpolate from a light to a dark app green by value/max.
// Zero (or no data) gets a neutral fill so "no users" reads differently from
// "a few users".
const SHADE_EMPTY = "#eef2f1";
const SHADE_LOW = [0xd9, 0xf5, 0xec];
const SHADE_HIGH = [0x0c, 0x7a, 0x65];
export function shade(value: number, max: number): string {
  if (!(value > 0) || !(max > 0)) return SHADE_EMPTY;
  // sqrt spreads the colors so one dominant state doesn't wash out the rest.
  const t = Math.min(1, Math.sqrt(value / max));
  const hex = SHADE_LOW.map((lo, i) =>
    Math.round(lo + (SHADE_HIGH[i] - lo) * t).toString(16).padStart(2, "0")
  );
  return `#${hex.join("")}`;
}

// Shift an ISO date by whole years, clamping Feb 29 to Feb 28 when the target
// year has no leap day (an invalid date would make GA4 reject the request).
export function shiftYear(iso: string, years = -1): string {
  const [y, m, d] = iso.split("-").map(Number);
  const ty = y + years;
  const daysInMonth = new Date(Date.UTC(ty, m, 0)).getUTCDate();
  return `${ty}-${String(m).padStart(2, "0")}-${String(Math.min(d, daysInMonth)).padStart(2, "0")}`;
}

// ---- Date-range presets, matching Looker Studio's date control -------------

export type DatePreset =
  | "custom" | "today" | "yesterday"
  | "thisWeekSun" | "thisWeekToDateSun" | "thisWeekMon" | "thisWeekToDateMon"
  | "thisMonth" | "thisMonthToDate" | "thisQuarter" | "thisQuarterToDate"
  | "thisYear" | "thisYearToDate"
  | "last7" | "last14" | "last28" | "last30" | "last90"
  | "lastWeekSun" | "lastWeekMon" | "lastMonth" | "lastQuarter" | "lastYear";

// Grouped like Looker Studio's date menu: top-level items, then the
// "This ..." and "Last ..." submenus.
export const PRESET_GROUPS: { label: string; items: { id: DatePreset; label: string }[] }[] = [
  {
    label: "",
    items: [
      { id: "custom", label: "Fixed" },
      { id: "today", label: "Today" },
      { id: "yesterday", label: "Yesterday" },
    ],
  },
  {
    label: "This period",
    items: [
      { id: "thisWeekSun", label: "This week (starts Sunday)" },
      { id: "thisWeekToDateSun", label: "This week to date (starts Sunday)" },
      { id: "thisWeekMon", label: "This week (starts Monday)" },
      { id: "thisWeekToDateMon", label: "This week to date (starts Monday)" },
      { id: "thisMonth", label: "This month" },
      { id: "thisMonthToDate", label: "This month to date" },
      { id: "thisQuarter", label: "This quarter" },
      { id: "thisQuarterToDate", label: "This quarter to date" },
      { id: "thisYear", label: "This year" },
      { id: "thisYearToDate", label: "This year to date" },
    ],
  },
  {
    label: "Last period",
    items: [
      { id: "last7", label: "Last 7 days" },
      { id: "last14", label: "Last 14 days" },
      { id: "last28", label: "Last 28 days" },
      { id: "last30", label: "Last 30 days" },
      { id: "last90", label: "Last 90 days" },
      { id: "lastWeekSun", label: "Last week (starts Sunday)" },
      { id: "lastWeekMon", label: "Last week (starts Monday)" },
      { id: "lastMonth", label: "Last month" },
      { id: "lastQuarter", label: "Last quarter" },
      { id: "lastYear", label: "Last year" },
    ],
  },
];

export const DATE_PRESETS = PRESET_GROUPS.flatMap((g) => g.items);
export function presetLabel(id: DatePreset): string {
  return DATE_PRESETS.find((p) => p.id === id)?.label ?? id;
}

// The Hearthside Looker report's default.
export const DEFAULT_PRESET: DatePreset = "thisYearToDate";

function addDaysIso(iso: string, n: number): string {
  const ms = Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}
function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
// First day of the month `offset` months from (y, m); m is 1-12.
function monthFirst(y: number, m: number, offset: number): string {
  const idx = y * 12 + (m - 1) + offset;
  return ymd(Math.floor(idx / 12), (idx % 12) + 1, 1);
}

// Resolve a preset to an inclusive ISO range, relative to `today` (ISO),
// following Looker Studio:
// - "This month" etc. cover the whole period, including days not yet reached.
// - "... to date" and "Last N days" end yesterday, or today with includeToday.
// - A to-date range on the period's first day (nothing before today) is today.
// Returns null for "custom" (Fixed), whose range comes from the user.
export function presetRange(
  preset: DatePreset,
  today: string,
  includeToday = false
): { startDate: string; endDate: string } | null {
  const [y, m] = today.split("-").map(Number);
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const yesterday = addDaysIso(today, -1);
  const last = includeToday ? today : yesterday;
  const r = (startDate: string, endDate: string) => ({ startDate, endDate });
  const toDate = (start: string) => r(start, last < start ? today : last);
  const lastN = (n: number) => r(addDaysIso(last, -(n - 1)), last);
  const sunStart = addDaysIso(today, -dow);
  const monStart = addDaysIso(today, -((dow + 6) % 7));
  const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
  const thisQuarter = ymd(y, qStartMonth, 1);

  switch (preset) {
    case "custom": return null;
    case "today": return r(today, today);
    case "yesterday": return r(yesterday, yesterday);
    case "thisWeekSun": return r(sunStart, addDaysIso(sunStart, 6));
    case "thisWeekToDateSun": return toDate(sunStart);
    case "thisWeekMon": return r(monStart, addDaysIso(monStart, 6));
    case "thisWeekToDateMon": return toDate(monStart);
    case "thisMonth": return r(ymd(y, m, 1), addDaysIso(monthFirst(y, m, 1), -1));
    case "thisMonthToDate": return toDate(ymd(y, m, 1));
    case "thisQuarter": return r(thisQuarter, addDaysIso(monthFirst(y, qStartMonth, 3), -1));
    case "thisQuarterToDate": return toDate(thisQuarter);
    case "thisYear": return r(ymd(y, 1, 1), ymd(y, 12, 31));
    case "thisYearToDate": return toDate(ymd(y, 1, 1));
    case "last7": return lastN(7);
    case "last14": return lastN(14);
    case "last28": return lastN(28);
    case "last30": return lastN(30);
    case "last90": return lastN(90);
    case "lastWeekSun": return r(addDaysIso(sunStart, -7), addDaysIso(sunStart, -1));
    case "lastWeekMon": return r(addDaysIso(monStart, -7), addDaysIso(monStart, -1));
    case "lastMonth": return r(monthFirst(y, m, -1), addDaysIso(ymd(y, m, 1), -1));
    case "lastQuarter": return r(monthFirst(y, qStartMonth, -3), addDaysIso(thisQuarter, -1));
    case "lastYear": return r(ymd(y - 1, 1, 1), ymd(y - 1, 12, 31));
  }
}

export type CompareMode = "period" | "year";

// The comparison window for %Δ: the previous period of the same length, or the
// same dates one year earlier (Looker Studio's two comparison options).
export function comparisonRange(start: string, end: string, mode: CompareMode): { start: string; end: string } {
  return mode === "year" ? { start: shiftYear(start), end: shiftYear(end) } : previousPeriod(start, end);
}

// Pivot long rows (date, series, value) into one object per date for a
// multi-line chart. Series get safe keys s0..sN (recharts reads a dotted
// dataKey as a nested path, so a label like "go.example.com" can't be a key),
// and every date carries every series, zero-filled, so lines don't break.
export function pivotDaily(
  rows: { date: string; series: string; value: number }[],
  seriesOrder: string[]
): { data: Record<string, number | string>[]; series: { key: string; label: string }[] } {
  const series = seriesOrder.map((label, i) => ({ key: `s${i}`, label }));
  const keyOf = new Map(series.map((s) => [s.label, s.key]));
  const byDate = new Map<string, Record<string, number | string>>();
  for (const r of rows) {
    const k = keyOf.get(r.series);
    if (!k) continue;
    const row = byDate.get(r.date) ?? { date: r.date };
    row[k] = ((row[k] as number) ?? 0) + r.value;
    byDate.set(r.date, row);
  }
  const data = [...byDate.values()]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((row) => {
      for (const s of series) if (row[s.key] == null) row[s.key] = 0;
      return row;
    });
  return { data, series };
}
