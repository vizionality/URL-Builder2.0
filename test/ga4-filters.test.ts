import { describe, it, expect } from "vitest";
import { exactFilter, pageFilterExpr, parsePageFilters } from "@/lib/ga4-filters";

describe("page filters", () => {
  it("parses repeated params, including cross-filters", () => {
    const f = parsePageFilters(new URLSearchParams("source=google&source=fb&channel=Paid+Search&region=Ohio&page="));
    expect(f.source).toEqual(["google", "fb"]);
    expect(f.channel).toEqual(["Paid Search"]);
    expect(f.region).toEqual(["Ohio"]);
    expect(f.page).toEqual([]);
  });

  it("returns no filter when nothing is selected", () => {
    expect(pageFilterExpr(parsePageFilters(new URLSearchParams()))).toEqual({});
  });

  it("uses a single expression alone and ANDs several", () => {
    const one = pageFilterExpr(parsePageFilters(new URLSearchParams("landing=/a")));
    expect(one).toEqual({ dimensionFilter: { filter: { fieldName: "landingPage", inListFilter: { values: ["/a"] } } } });
    const many = pageFilterExpr(parsePageFilters(new URLSearchParams("medium=cpc")), [exactFilter("country", "United States")]);
    expect((many.dimensionFilter as { andGroup: { expressions: unknown[] } }).andGroup.expressions).toHaveLength(2);
  });
});

describe("AI source filter", () => {
  it("adds a case-insensitive regex on sessionSource when ai=1", async () => {
    const { parsePageFilters, pageFilterExpr, AI_SOURCE_REGEX } = await import("@/lib/ga4-filters");
    const f = parsePageFilters(new URLSearchParams("ai=1"));
    expect(f.ai).toBe(true);
    expect(pageFilterExpr(f)).toEqual({
      dimensionFilter: {
        filter: { fieldName: "sessionSource", stringFilter: { value: AI_SOURCE_REGEX, matchType: "FULL_REGEXP", caseSensitive: false } },
      },
    });
    expect(parsePageFilters(new URLSearchParams("")).ai).toBe(false);
  });

  it("matches common AI referrers and not ordinary ones", async () => {
    const { AI_SOURCE_REGEX } = await import("@/lib/ga4-filters");
    const re = new RegExp(`^${AI_SOURCE_REGEX}$`, "i");
    for (const s of ["chatgpt.com", "chat.openai.com", "perplexity.ai", "gemini.google.com", "copilot.microsoft.com", "claude.ai", "chat.deepseek.com"]) {
      expect(re.test(s)).toBe(true);
    }
    for (const s of ["google", "facebook.com", "(direct)", "bing"]) expect(re.test(s)).toBe(false);
  });
});
