import { describe, expect, it } from "vitest";
import { hostOf, matchSite } from "@/lib/site-match";

describe("site matching", () => {
  it("normalizes hosts", () => {
    expect(hostOf("https://www.Example.com/a")).toBe("example.com");
    expect(hostOf("example.com")).toBe("example.com");
    expect(hostOf("")).toBe("");
  });

  it("prefers the domain property, then a URL prefix", () => {
    const sites = ["https://www.example.com/", "sc-domain:example.com", "sc-domain:other.com"];
    expect(matchSite("www.example.com", sites)).toBe("sc-domain:example.com");
    expect(matchSite("example.com", ["https://www.example.com/"])).toBe("https://www.example.com/");
    expect(matchSite("nope.com", sites)).toBeNull();
  });
});
