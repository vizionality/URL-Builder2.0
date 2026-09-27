import { describe, expect, it } from "vitest";
import { isSlug, slugify, splitClientPath, uniqueSlug } from "@/lib/client-slug";

describe("client slugs", () => {
  it("slugifies names", () => {
    expect(slugify("Hearthside Fireplace & Doors")).toBe("hearthside-fireplace-doors");
    expect(slugify("  Café Olé ")).toBe("cafe-ole");
    expect(slugify("!!!")).toBe("client");
  });

  it("makes slugs unique", () => {
    expect(uniqueSlug("Acme", [])).toBe("acme");
    expect(uniqueSlug("Acme", ["acme", "acme-2"])).toBe("acme-3");
  });

  it("validates slugs", () => {
    expect(isSlug("acme-2")).toBe(true);
    expect(isSlug("Acme")).toBe(false);
    expect(isSlug("a--b")).toBe(false);
    expect(isSlug(null)).toBe(false);
  });

  it("splits client paths", () => {
    expect(splitClientPath("/c/acme/dashboard/seo")).toEqual({ slug: "acme", rest: "/dashboard/seo" });
    expect(splitClientPath("/c/acme")).toEqual({ slug: "acme", rest: "/" });
    expect(splitClientPath("/dashboard")).toEqual({ slug: null, rest: "/dashboard" });
  });
});
