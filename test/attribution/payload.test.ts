import { describe, it, expect } from "vitest";
import {
  normalizeTouch,
  normalizeTouches,
  hasSignal,
  normalizeConversion,
  hashIdentity,
  isValidUuid,
} from "@/lib/attribution/payload";

describe("touch normalization", () => {
  it("maps utm and click fields, folding click ids into an object", () => {
    const row = normalizeTouch({
      utm_source: "google",
      utm_medium: "cpc",
      utm_campaign: "spring",
      gclid: "abc123",
      msclkid: "xyz",
      referrer: "https://news.example.com/",
      landing_page: "/land?utm_source=google",
      timestamp: "2026-03-01T00:00:00.000Z",
      is_organic: false,
    });
    expect(row.source).toBe("google");
    expect(row.medium).toBe("cpc");
    expect(row.campaign).toBe("spring");
    expect(row.clickIds).toEqual({ gclid: "abc123", msclkid: "xyz" });
    expect(row.referrer).toBe("https://news.example.com/");
    expect(row.occurredAt).toBe("2026-03-01T00:00:00.000Z");
    expect(row.isOrganic).toBe(false);
  });

  it("caps long strings and drops empties to null", () => {
    const long = "x".repeat(1000);
    const row = normalizeTouch({ utm_source: long, utm_medium: "  " });
    expect(row.source?.length).toBe(512);
    expect(row.medium).toBeNull();
  });

  it("defaults a missing/invalid timestamp to now (valid ISO)", () => {
    const row = normalizeTouch({ utm_source: "x", timestamp: "not-a-date" });
    expect(Number.isNaN(Date.parse(row.occurredAt))).toBe(false);
  });

  it("normalizeTouches ignores non-arrays and junk entries, caps at 50", () => {
    expect(normalizeTouches("nope")).toEqual([]);
    const many = Array.from({ length: 60 }, (_, i) => ({ utm_source: `s${i}` }));
    expect(normalizeTouches(many)).toHaveLength(50);
    const mixed = normalizeTouches([{ utm_source: "a" }, null, 5, { utm_medium: "b" }]);
    expect(mixed).toHaveLength(2);
  });

  it("hasSignal keeps tagged/referrer touches and drops empty ones", () => {
    expect(hasSignal(normalizeTouch({ utm_source: "google" }))).toBe(true);
    expect(hasSignal(normalizeTouch({ gclid: "x" }))).toBe(true);
    expect(hasSignal(normalizeTouch({ referrer: "https://x.com/" }))).toBe(true);
    expect(hasSignal(normalizeTouch({ landing_page: "/", timestamp: "2026-01-01" }))).toBe(false);
  });
});

describe("conversion normalization", () => {
  it("requires a name and coerces value/metadata", () => {
    expect(normalizeConversion({})).toBeNull();
    const c = normalizeConversion({ name: "signup", value: 49.5, metadata: { plan: "pro" } });
    expect(c?.name).toBe("signup");
    expect(c?.value).toBe(49.5);
    expect(c?.metadata).toEqual({ plan: "pro" });
  });

  it("non-numeric value becomes null", () => {
    const c = normalizeConversion({ name: "x", value: "free" });
    expect(c?.value).toBeNull();
  });
});

describe("identity hashing", () => {
  it("is deterministic, case/space-insensitive, and non-reversible-looking", () => {
    const a = hashIdentity("User@Example.com ", "salt1");
    const b = hashIdentity("user@example.com", "salt1");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("example.com");
  });

  it("different salts yield different hashes for the same email", () => {
    expect(hashIdentity("a@b.com", "s1")).not.toBe(hashIdentity("a@b.com", "s2"));
  });
});

describe("uuid validation", () => {
  it("accepts a v4-shaped uuid and rejects junk", () => {
    expect(isValidUuid("3b3a6956-b968-4d8c-8c00-7253716e3354")).toBe(true);
    expect(isValidUuid("nope")).toBe(false);
    expect(isValidUuid(123)).toBe(false);
  });
});
