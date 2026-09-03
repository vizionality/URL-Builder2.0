import { describe, it, expect } from "vitest";
import { mean, median, stddev } from "@/lib/indicators/stats";
import { wilsonInterval } from "@/lib/indicators/wilson";

describe("stats helpers", () => {
  it("mean and median on hand values", () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });

  it("median ignores non-finite entries", () => {
    expect(median([1, 2, NaN, 3])).toBe(2);
  });

  it("sample stddev (n-1) on a known set", () => {
    // values 2,4,4,4,5,5,7,9 -> mean 5, sample sd = sqrt(32/7) ~= 2.138.
    expect(stddev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.13809, 4);
  });

  it("stddev of a single point is 0, not NaN", () => {
    expect(stddev([5])).toBe(0);
  });
});

describe("Wilson score interval", () => {
  it("brackets the point estimate and stays in [0,1]", () => {
    const w = wilsonInterval(50, 100);
    expect(w.center).toBeGreaterThan(0.49);
    expect(w.center).toBeLessThan(0.51);
    expect(w.lower).toBeGreaterThanOrEqual(0);
    expect(w.upper).toBeLessThanOrEqual(1);
    expect(w.lower).toBeLessThan(w.center);
    expect(w.upper).toBeGreaterThan(w.center);
  });

  it("low volume yields a wider band than high volume at the same rate", () => {
    const few = wilsonInterval(5, 10);
    const many = wilsonInterval(500, 1000);
    expect(few.upper - few.lower).toBeGreaterThan(many.upper - many.lower);
  });

  it("zero trials degrades to an empty interval, not NaN", () => {
    expect(wilsonInterval(0, 0)).toEqual({ lower: 0, center: 0, upper: 0 });
  });
});
