import { describe, it, expect } from "vitest";
import { buildGtmTag } from "@/lib/attribution/snippet";

describe("GTM tag generator", () => {
  const tag = buildGtmTag({
    collectorHost: "metrics.clientsite.com",
    siteKey: "sk_test123",
  });

  it("embeds the collector endpoint and site key", () => {
    expect(tag).toContain('"https://metrics.clientsite.com/collect"');
    expect(tag).toContain('"sk_test123"');
  });

  it("is wrapped in a script tag and self-invokes", () => {
    expect(tag.trim().startsWith("<script>")).toBe(true);
    expect(tag.trim().endsWith("</script>")).toBe(true);
    expect(tag).toContain("(function ()");
  });

  it("gates on consent and beacons the payload", () => {
    expect(tag).toContain("consentOk");
    expect(tag).toContain("attr_consent");
    expect(tag).toContain("sendBeacon");
  });

  it("json-encodes values so a quote in a key cannot break out of the string", () => {
    const evil = buildGtmTag({ collectorHost: "h.com", siteKey: 'a"b' });
    expect(evil).toContain('"a\\"b"');
  });
});
