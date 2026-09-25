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
