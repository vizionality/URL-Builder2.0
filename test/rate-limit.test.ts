import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, sweepExpired } from "@/lib/rate-limit";

describe("fixed-window rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit, then rejects within the window", () => {
    const key = `k-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("resets after the window elapses", () => {
    const key = `k-${Math.random()}`;
    expect(rateLimit(key, 1, 60_000).allowed).toBe(true);
    expect(rateLimit(key, 1, 60_000).allowed).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(rateLimit(key, 1, 60_000).allowed).toBe(true);
  });

  it("counts each key independently", () => {
    expect(rateLimit("a", 1, 60_000).allowed).toBe(true);
    expect(rateLimit("b", 1, 60_000).allowed).toBe(true);
    expect(rateLimit("a", 1, 60_000).allowed).toBe(false);
  });

  it("remaining counts down from limit-1", () => {
    const key = `k-${Math.random()}`;
    expect(rateLimit(key, 5, 60_000).remaining).toBe(4);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(3);
  });

  it("sweepExpired drops elapsed windows without affecting live ones", () => {
    const live = `live-${Math.random()}`;
    const dead = `dead-${Math.random()}`;
    rateLimit(dead, 1, 1_000);
    rateLimit(live, 1, 60_000);
    vi.advanceTimersByTime(2_000);
    sweepExpired();
    // dead's window was swept, so it starts fresh (allowed); live is still capped.
    expect(rateLimit(dead, 1, 1_000).allowed).toBe(true);
    expect(rateLimit(live, 1, 60_000).allowed).toBe(false);
  });
});
