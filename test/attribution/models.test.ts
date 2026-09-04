import { describe, it, expect } from "vitest";
import {
  firstTouch,
  lastTouch,
  linear,
  positionBased,
  timeDecay,
  creditFor,
} from "@/lib/attribution/models";

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

describe("credit models sum to 1 and place credit correctly", () => {
  it("first / last", () => {
    expect(firstTouch(3)).toEqual([1, 0, 0]);
    expect(lastTouch(3)).toEqual([0, 0, 1]);
  });

  it("linear splits evenly", () => {
    expect(linear(4)).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(sum(linear(7))).toBeCloseTo(1, 10);
  });

  it("position based: 40/20/40 with the middle shared", () => {
    expect(positionBased(1)).toEqual([1]);
    expect(positionBased(2)).toEqual([0.5, 0.5]);
    // 4 touches: 0.4, 0.1, 0.1, 0.4
    expect(positionBased(4)).toEqual([0.4, 0.1, 0.1, 0.4]);
    expect(sum(positionBased(5))).toBeCloseTo(1, 10);
  });

  it("time decay halves every half-life and sums to 1", () => {
    // Two touches: one 7 days before conversion, one at conversion. With a
    // 7-day half-life the older touch weighs 0.5 vs 1.0, so credit is 1/3, 2/3.
    const conv = Date.UTC(2026, 0, 8);
    const t0 = Date.UTC(2026, 0, 1); // 7 days earlier
    const t1 = conv; // at conversion
    const credit = timeDecay([t0, t1], conv, 7);
    expect(sum(credit)).toBeCloseTo(1, 10);
    expect(credit[0]).toBeCloseTo(1 / 3, 6);
    expect(credit[1]).toBeCloseTo(2 / 3, 6);
  });

  it("creditFor dispatches to the right model", () => {
    const conv = Date.UTC(2026, 0, 8);
    expect(creditFor("first", [1, 2, 3], conv)).toEqual([1, 0, 0]);
    expect(creditFor("linear", [1, 2], conv)).toEqual([0.5, 0.5]);
  });
});
