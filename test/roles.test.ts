import { describe, expect, it } from "vitest";
import { atLeast, canSeeClient, parseMemberRole } from "@/lib/roles";

describe("roles", () => {
  it("orders roles", () => {
    expect(atLeast("owner", "admin")).toBe(true);
    expect(atLeast("admin", "analyst")).toBe(true);
    expect(atLeast("analyst", "admin")).toBe(false);
    expect(atLeast("viewer", "analyst")).toBe(false);
    expect(atLeast("viewer", "viewer")).toBe(true);
  });

  it("parses member roles", () => {
    expect(parseMemberRole("analyst")).toBe("analyst");
    expect(parseMemberRole("owner")).toBeNull();
    expect(parseMemberRole(undefined)).toBeNull();
  });

  it("limits clients", () => {
    expect(canSeeClient(null, "acme")).toBe(true);
    expect(canSeeClient(["acme"], "acme")).toBe(true);
    expect(canSeeClient(["acme"], "other")).toBe(false);
  });
});
