import { describe, it, expect, beforeEach } from "vitest";
import { getCached, setCached, clearCache } from "@/lib/response-cache";

describe("response cache", () => {
  beforeEach(() => clearCache());

  it("returns a stored value within its lifetime", () => {
    setCached("/a", { n: 1 }, 1_000);
    expect(getCached("/a", 1_000 + 60_000)).toEqual({ n: 1 });
  });

  it("expires entries after five minutes", () => {
    setCached("/a", { n: 1 }, 0);
    expect(getCached("/a", 5 * 60 * 1000 + 1)).toBeUndefined();
  });

  it("evicts the oldest entries past the cap, keeping recent ones", () => {
    for (let i = 0; i < 65; i++) setCached(`/k${i}`, i, 0);
    expect(getCached("/k0", 0)).toBeUndefined();
    expect(getCached("/k4", 0)).toBeUndefined();
    expect(getCached("/k5", 0)).toBe(5);
    expect(getCached("/k64", 0)).toBe(64);
  });

  it("re-setting a key refreshes its recency", () => {
    for (let i = 0; i < 60; i++) setCached(`/k${i}`, i, 0);
    setCached("/k0", "fresh", 0); // now most recent
    setCached("/new", 1, 0); // pushes out the oldest, which is now /k1
    expect(getCached("/k0", 0)).toBe("fresh");
    expect(getCached("/k1", 0)).toBeUndefined();
  });
});
