import { describe, expect, it } from "vitest";
import { change, healthFlags, last28, type HealthInput } from "@/lib/client-health";

const ok: HealthInput = { hasProperty: true, hasSite: true, googleError: false, keyEventCount: 2, sessions: { current: 10, previous: 5 }, gscError: false };

describe("client health", () => {
  it("has no flags when everything is set up", () => {
    expect(healthFlags(ok)).toEqual([]);
  });

  it("flags missing setup and problems", () => {
    const ids = (h: Partial<HealthInput>) => healthFlags({ ...ok, ...h }).map((f) => f.id);
    expect(ids({ keyEventCount: 0 })).toEqual(["keyEvents"]);
    expect(ids({ keyEventCount: null })).toEqual([]);
    expect(ids({ hasSite: false })).toEqual(["gsc"]);
    expect(ids({ hasProperty: false })).toEqual(["ga4"]);
    expect(ids({ googleError: true })).toEqual(["google"]);
    expect(ids({ sessions: { current: 0, previous: 3 } })).toEqual(["noTraffic"]);
  });

  it("computes changes and the 28-day window", () => {
    expect(change({ current: 15, previous: 10 })).toBe(50);
    expect(change({ current: 5, previous: 0 })).toBeNull();
    expect(last28("2026-03-01")).toEqual({ start: "2026-02-01", end: "2026-02-28", prevStart: "2026-01-04", prevEnd: "2026-01-31" });
  });
});
