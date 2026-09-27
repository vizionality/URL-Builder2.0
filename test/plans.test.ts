import { describe, expect, it } from "vitest";
import { canAddClient, canAddGoogleAccount, parsePlan } from "@/lib/plans";

describe("plans", () => {
  it("defaults to business", () => {
    expect(parsePlan(undefined)).toBe("business");
    expect(parsePlan("agency")).toBe("agency");
  });

  it("limits business to one client and one Google login", () => {
    expect(canAddClient("business", 0)).toBe(true);
    expect(canAddClient("business", 1)).toBe(false);
    expect(canAddClient("agency", 500)).toBe(true);
    expect(canAddGoogleAccount("business", [], "a@x.com")).toBe(true);
    expect(canAddGoogleAccount("business", ["a@x.com"], "a@x.com")).toBe(true);
    expect(canAddGoogleAccount("business", ["a@x.com"], "b@x.com")).toBe(false);
    expect(canAddGoogleAccount("agency", ["a@x.com"], "b@x.com")).toBe(true);
  });
});
