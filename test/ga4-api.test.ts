import { describe, it, expect } from "vitest";
import { limitAll, withRetry, isTransient, Ga4Error, ga4FailureMessage } from "@/lib/ga4-api";

const tick = () => new Promise((r) => setTimeout(r, 5));

describe("limitAll", () => {
  it("never runs more than `limit` tasks at once and keeps result order", async () => {
    let running = 0;
    let peak = 0;
    const tasks = Array.from({ length: 8 }, (_, i) => async () => {
      running++;
      peak = Math.max(peak, running);
      await tick();
      running--;
      return i * 10;
    });
    const out = await limitAll(tasks, 3);
    expect(out).toEqual([0, 10, 20, 30, 40, 50, 60, 70]);
    expect(peak).toBe(3);
  });

  it("stops starting new tasks after a failure", async () => {
    let started = 0;
    const tasks = Array.from({ length: 6 }, (_, i) => async () => {
      started++;
      await tick();
      if (i === 0) throw new Error("boom");
      return i;
    });
    await expect(limitAll(tasks, 2)).rejects.toThrow("boom");
    // Two start together; when task 0 fails, at most the other in-flight
    // worker picks up one more. Nowhere near all six.
    expect(started).toBeLessThanOrEqual(3);
  });
});

describe("withRetry", () => {
  it("retries transient failures, then succeeds", async () => {
    let calls = 0;
    const out = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Ga4Error(429, "quota");
        return "ok";
      },
      isTransient,
      [0, 0]
    );
    expect(out).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry a non-transient failure", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => { calls++; throw new Ga4Error(400, "bad"); }, isTransient, [0, 0])
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("gives up after the last delay", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => { calls++; throw new Ga4Error(429, "quota"); }, isTransient, [0, 0])
    ).rejects.toThrow();
    expect(calls).toBe(3);
  });
});

describe("ga4FailureMessage", () => {
  it("names the kind of failure without GA4's raw text", () => {
    expect(ga4FailureMessage(new Ga4Error(429, "secret detail"))).toMatch(/rate-limiting/);
    expect(ga4FailureMessage(new Ga4Error(400, "secret detail"))).toMatch(/selected filters/);
    expect(ga4FailureMessage(new Ga4Error(403, "x"))).toMatch(/denied access/);
    expect(ga4FailureMessage(new Ga4Error(503, "x"))).toMatch(/temporarily unavailable/);
    expect(ga4FailureMessage(new Error("other"))).toBe("GA4 report failed. Try again shortly.");
    expect(ga4FailureMessage(new Ga4Error(429, "secret detail"))).not.toContain("secret");
  });
});
