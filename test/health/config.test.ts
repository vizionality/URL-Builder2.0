import { describe, it, expect } from "vitest";
import { parseConfig, CONFIG_DEFAULTS } from "@/lib/health/config";

describe("config parsing", () => {
  it("missing values fall back to documented defaults", () => {
    const cfg = parseConfig({ property_id: "123456789" });
    expect(cfg.propertyId).toBe("123456789");
    expect(cfg.lagDays).toBe(CONFIG_DEFAULTS.lag_days);
    expect(cfg.baselineWeeks).toBe(CONFIG_DEFAULTS.baseline_weeks);
    expect(cfg.dropPctHigh).toBe(CONFIG_DEFAULTS.drop_pct_high);
    expect(cfg.minSessionsPage).toBe(CONFIG_DEFAULTS.min_sessions_page);
    expect(cfg.keyEvents).toEqual([]);
  });

  it("a missing property_id fails with a clear error, not a null dereference", () => {
    expect(() => parseConfig({})).toThrow(/property_id/i);
    expect(() => parseConfig({ property_id: "" })).toThrow(/property_id/i);
  });

  it("parses key_events into a trimmed list", () => {
    const cfg = parseConfig({ property_id: "1", key_events: " purchase, sign_up ,, add_to_cart " });
    expect(cfg.keyEvents).toEqual(["purchase", "sign_up", "add_to_cart"]);
  });

  it("coerces numeric overrides and ignores non-numeric junk", () => {
    const cfg = parseConfig({ property_id: "1", drop_pct_high: "80", lag_days: "3" });
    expect(cfg.dropPctHigh).toBe(80);
    expect(cfg.lagDays).toBe(3);
    const bad = parseConfig({ property_id: "1", drop_pct_high: "not-a-number" });
    expect(bad.dropPctHigh).toBe(CONFIG_DEFAULTS.drop_pct_high);
  });
});
