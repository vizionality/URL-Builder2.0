import { describe, it, expect } from "vitest";
import { channelOf } from "@/lib/attribution/channels";

const base = { source: null, medium: null, clickIds: {}, referrer: null };

describe("channel grouping", () => {
  it("paid click ids win over everything", () => {
    expect(channelOf({ ...base, clickIds: { gclid: "x" } })).toBe("Paid Search");
    expect(channelOf({ ...base, clickIds: { fbclid: "x" } })).toBe("Paid Social");
    // even with a misleading medium, the paid click id decides
    expect(channelOf({ ...base, medium: "organic", clickIds: { msclkid: "x" } })).toBe(
      "Paid Search"
    );
  });

  it("maps common UTM mediums", () => {
    expect(channelOf({ ...base, medium: "cpc" })).toBe("Paid Search");
    expect(channelOf({ ...base, medium: "email" })).toBe("Email");
    expect(channelOf({ ...base, medium: "social" })).toBe("Organic Social");
    expect(channelOf({ ...base, medium: "display" })).toBe("Display");
    expect(channelOf({ ...base, medium: "affiliate" })).toBe("Affiliate");
    expect(channelOf({ ...base, medium: "referral" })).toBe("Referral");
    expect(channelOf({ ...base, medium: "organic" })).toBe("Organic Search");
  });

  it("falls back to source, then referrer host, then Direct", () => {
    expect(channelOf({ ...base, source: "facebook" })).toBe("Organic Social");
    expect(channelOf({ ...base, source: "google" })).toBe("Organic Search");
    expect(channelOf({ ...base, referrer: "https://www.google.com/search" })).toBe(
      "Organic Search"
    );
    expect(channelOf({ ...base, referrer: "https://news.ycombinator.com/" })).toBe(
      "Referral"
    );
    expect(channelOf(base)).toBe("Direct");
  });
});
