import { describe, it, expect } from "vitest";
import { suggestScanName } from "@/lib/screener";

describe("suggestScanName", () => {
  it("joins dimension, metric, and condition labels", () => {
    expect(
      suggestScanName({ dimension: "campaign", metric: "sessions", conditions: ["cusum"] })
    ).toBe("Campaign · Sessions · CUSUM");
  });

  it("lists multiple conditions", () => {
    expect(
      suggestScanName({
        dimension: "source",
        metric: "conversions",
        conditions: ["cusum", "pctBaseline", "crossover"],
      })
    ).toBe("Source · Conversions · CUSUM, Baseline, Crossover");
  });

  it("omits the conditions segment when none are selected", () => {
    expect(
      suggestScanName({ dimension: "landingPage", metric: "sessions", conditions: [] })
    ).toBe("Landing page · Sessions");
  });
});
