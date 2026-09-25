import { describe, it, expect, vi, afterEach } from "vitest";
import { limitAll, withRetry, isTransient, Ga4Error, ga4FailureMessage, batchRunReports, chunk } from "@/lib/ga4-api";

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

describe("batchRunReports", () => {
  afterEach(() => vi.unstubAllGlobals());

  // Fake GA4: each report's single row echoes its request's `tag`.
  function fakeGa4(calls: { requests: { tag: number }[] }[], dropIndex?: number) {
    vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as { requests: { tag: number }[] };
      calls.push(body);
      const reports = body.requests.map((r) => ({ rows: [{ dimensionValues: [{ value: String(r.tag) }] }] }));
      if (dropIndex != null) reports.splice(dropIndex, 1);
      return { ok: true, json: async () => ({ reports }) } as unknown as Response;
    });
  }

  it("sends six reports as two batch calls and keeps them in order", async () => {
    const calls: { requests: { tag: number }[] }[] = [];
    fakeGa4(calls);
    const bodies = Array.from({ length: 6 }, (_, i) => ({ tag: i }));
    const out = await batchRunReports("123", "tok", bodies);
    expect(calls.map((c) => c.requests.length)).toEqual([5, 1]);
    expect(out.map((rows) => rows[0].dimensionValues?.[0].value)).toEqual(["0", "1", "2", "3", "4", "5"]);
  });

  it("a missing report becomes empty rows without shifting later results", async () => {
    const calls: { requests: { tag: number }[] }[] = [];
    fakeGa4(calls, 4); // GA4 returns only 4 of 5 reports in the batch
    const out = await batchRunReports("123", "tok", Array.from({ length: 5 }, (_, i) => ({ tag: i })));
    expect(out).toHaveLength(5);
    expect(out[4]).toEqual([]);
    expect(out[3][0].dimensionValues?.[0].value).toBe("3");
  });

  it("makes no request when there is nothing to run", async () => {
    const calls: { requests: { tag: number }[] }[] = [];
    fakeGa4(calls);
    expect(await batchRunReports("123", "tok", [])).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("chunk splits in order", () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([[1, 2, 3, 4, 5], [6, 7]]);
  });
});

describe("breakdown metric helpers", () => {
  it("resolves key events to the property's metric name and reads rows back", async () => {
    const { breakdownMetricNames, rowMetricValues } = await import("@/lib/ga4-api");
    expect(breakdownMetricNames("conversions").map((m) => m.name)).toEqual([
      "totalUsers", "newUsers", "sessions", "engagedSessions", "conversions",
    ]);
    const row = { metricValues: ["10", "4", "12", "8", "2"].map((value) => ({ value })) };
    expect(rowMetricValues(row)).toEqual({ totalUsers: 10, newUsers: 4, sessions: 12, engagedSessions: 8, keyEvents: 2 });
  });
});
