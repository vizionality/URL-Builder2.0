import { describe, it, expect } from "vitest";
import { screen, SCREEN_DEFAULTS, type ScreenItem } from "@/lib/indicators/screen";
import type { Point } from "@/lib/indicators/types";
import { addDays } from "@/lib/indicators/dates";

function series(start: string, values: number[]): Point[] {
  return values.map((value, i) => ({ date: addDays(start, i), value }));
}

const START = "2026-01-01";

// A flat baseline that jumps to a new level for the final `stepLen` days.
function stepUp(base: number, stepped: number, len = 120, stepLen = 10): Point[] {
  const vals = Array.from({ length: len }, (_, i) => (i >= len - stepLen ? stepped : base));
  return series(START, vals);
}

function item(value: string, s: Point[]): ScreenItem {
  return { value, series: s, total: s.reduce((sum, p) => sum + p.value, 0) };
}

describe("screener scan", () => {
  it("flags a recent upward step with a CUSUM break and a baseline breach", () => {
    const res = screen([item("campaign_a", stepUp(100, 200))], SCREEN_DEFAULTS);
    expect(res.scanned).toBe(1);
    expect(res.hits).toHaveLength(1);
    const hit = res.hits[0];
    expect(hit.value).toBe("campaign_a");
    expect(hit.matched.some((m) => m.type === "cusum" && m.direction === "up")).toBe(true);
    expect(hit.matched.some((m) => m.type === "pctBaseline" && m.direction === "up")).toBe(true);
    expect(hit.pctChange).toBeGreaterThan(25);
    expect(hit.sparkline.length).toBeGreaterThan(0);
  });

  it("does not flag a flat series", () => {
    const res = screen([item("steady", series(START, new Array(120).fill(100)))], SCREEN_DEFAULTS);
    expect(res.scanned).toBe(1);
    expect(res.hits).toHaveLength(0);
  });

  it("skips values below the volume floor before scanning", () => {
    const tiny: ScreenItem = { value: "rare", series: stepUp(1, 2), total: 10 };
    const res = screen([tiny], { ...SCREEN_DEFAULTS, minVolume: 50 });
    expect(res.skippedVolume).toBe(1);
    expect(res.scanned).toBe(0);
    expect(res.hits).toHaveLength(0);
  });

  it("respects the enabled-conditions set (pctBaseline only)", () => {
    const res = screen([item("c", stepUp(100, 200))], {
      ...SCREEN_DEFAULTS,
      conditions: ["pctBaseline"],
    });
    const hit = res.hits[0];
    expect(hit.matched.every((m) => m.type === "pctBaseline")).toBe(true);
  });

  it("ranks CUSUM hits above pure baseline hits", () => {
    const withCusum = item("jumpy", stepUp(100, 300));
    // A gently elevated series: above baseline enough to breach pct, but with no
    // sharp step, so it should score below the CUSUM hit.
    const gentle = item("drifty", series(START, [
      ...new Array(90).fill(100),
      ...new Array(30).fill(140),
    ]));
    const res = screen([gentle, withCusum], SCREEN_DEFAULTS);
    expect(res.hits[0].value).toBe("jumpy");
  });
});
