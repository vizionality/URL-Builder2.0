import { describe, it, expect } from "vitest";
import { checkTracking } from "@/lib/health/checks";
import {
  baselineDates,
  weekdayOf,
  addDays,
  median,
  pctChange,
} from "@/lib/health/baseline";
import { parseConfig } from "@/lib/health/config";
import type { EventRow } from "@/lib/health/types";

const config = parseConfig({ property_id: "123" });

// Weekly seasonality: weekends run at ~40% of a weekday.
function seasonalValue(iso: string): number {
  const wd = weekdayOf(iso);
  return wd === 0 || wd === 6 ? 400 : 1000;
}

describe("seasonality regression (the baseline's whole reason to exist)", () => {
  const target = "2026-03-07"; // a Saturday
  const baseDates = baselineDates(target, config.baselineWeeks);

  it("a Saturday target produces NO alert under the same-weekday median baseline", () => {
    // Baseline = previous 4 Saturdays, all ~400. Observed Saturday ~400 too.
    const rows: EventRow[] = [...baseDates, target].map((date) => ({
      date,
      eventName: "purchase",
      eventCount: seasonalValue(date),
    }));

    const alerts = checkTracking(rows, target, baseDates, config);
    expect(alerts).toEqual([]);
  });

  it("PROVES a naive trailing-7-day mean WOULD have fired on the same data", () => {
    // The 7 days before the target include 5 weekdays at 1000, inflating a
    // trailing mean well above the true Saturday level of 400.
    const trailing: number[] = [];
    for (let i = 1; i <= 7; i++) trailing.push(seasonalValue(addDays(target, -i)));
    const naiveMean = trailing.reduce((s, v) => s + v, 0) / trailing.length;
    const observed = seasonalValue(target); // 400

    const naiveChange = pctChange(observed, naiveMean);
    // A naive baseline reads this healthy Saturday as a big drop...
    expect(naiveChange).toBeLessThanOrEqual(-config.dropPctMedium);

    // ...whereas the same-weekday median sees no change at all.
    const sameWeekdayBaseline = median(baseDates.map(seasonalValue));
    expect(pctChange(observed, sameWeekdayBaseline)).toBe(0);
  });
});

describe("tracking breakage cases", () => {
  const target = "2026-03-16";
  const baseDates = baselineDates(target, config.baselineWeeks);

  function rowsFor(name: string, baseVal: number, targetVal: number): EventRow[] {
    return [
      ...baseDates.map((date) => ({ date, eventName: name, eventCount: baseVal })),
      { date: target, eventName: name, eventCount: targetVal },
    ];
  }

  it("event at zero -> HIGH stopped firing", () => {
    const a = checkTracking(rowsFor("purchase", 1000, 0), target, baseDates, config);
    expect(a).toHaveLength(1);
    expect(a[0].severity).toBe("HIGH");
    expect(a[0].detail).toMatch(/stopped firing/i);
  });

  it("collapse (>= drop_pct_high) -> HIGH", () => {
    const a = checkTracking(rowsFor("purchase", 1000, 100), target, baseDates, config);
    expect(a[0].severity).toBe("HIGH");
  });

  it("moderate drop (>= drop_pct_medium, < high) -> MEDIUM", () => {
    const a = checkTracking(rowsFor("purchase", 1000, 550), target, baseDates, config);
    expect(a[0].severity).toBe("MEDIUM");
  });

  it("drop within tolerance -> no alert", () => {
    const a = checkTracking(rowsFor("purchase", 1000, 900), target, baseDates, config);
    expect(a).toEqual([]);
  });

  it("3x spike -> MEDIUM possible duplicate", () => {
    const a = checkTracking(rowsFor("purchase", 1000, 3000), target, baseDates, config);
    expect(a).toHaveLength(1);
    expect(a[0].severity).toBe("MEDIUM");
    expect(a[0].detail).toMatch(/duplicate/i);
  });

  it("sparse event below the volume floor is ignored", () => {
    // baseline median 5 < min_event_volume (10): even a total stop is ignored.
    const a = checkTracking(rowsFor("rare_event", 5, 0), target, baseDates, config);
    expect(a).toEqual([]);
  });

  it("a configured key event with no rows anywhere -> HIGH renamed/removed", () => {
    const cfg = parseConfig({ property_id: "123", key_events: "purchase, sign_up" });
    // Only "purchase" appears; "sign_up" is entirely absent.
    const rows = rowsFor("purchase", 1000, 1000);
    const a = checkTracking(rows, target, baseDates, cfg);
    const renamed = a.find((x) => x.subject === "sign_up");
    expect(renamed?.severity).toBe("HIGH");
    expect(renamed?.detail).toMatch(/renamed or removed/i);
  });
});
