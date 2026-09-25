import { describe, expect, it } from "vitest";
import { isValidEventName, suggestKeyEvents } from "@/lib/key-event-suggestions";

describe("suggestKeyEvents", () => {
  const events = [
    { name: "page_view", count: 5000 },
    { name: "scroll", count: 900 },
    { name: "file_download", count: 40 },
    { name: "form_submit", count: 12 },
    { name: "generate_lead", count: 30 },
    { name: "click", count: 300 },
    { name: "phone_click", count: 8 },
  ];

  it("ranks strong conversions first, then by volume, skipping automatic events", () => {
    const s = suggestKeyEvents(events);
    expect(s.map((x) => x.name)).toEqual(["generate_lead", "form_submit", "phone_click", "file_download"]);
    expect(s[0].strength).toBe("strong");
    expect(s[3].strength).toBe("good");
  });

  it("leaves out events already marked and events with no count", () => {
    const s = suggestKeyEvents([...events, { name: "sign_up", count: 0 }], new Set(["generate_lead"]));
    expect(s.map((x) => x.name)).not.toContain("generate_lead");
    expect(s.map((x) => x.name)).not.toContain("sign_up");
  });

  it("treats a lead CTA click as secondary to the lead itself", () => {
    const s = suggestKeyEvents([
      { name: "lead_cta_click", count: 50 },
      { name: "generate_lead", count: 5 },
      { name: "form_start", count: 20 },
    ]);
    expect(s.map((x) => [x.name, x.strength])).toEqual([["generate_lead", "strong"], ["lead_cta_click", "good"]]);
  });

  it("validates event names", () => {
    expect(isValidEventName("generate_lead")).toBe(true);
    expect(isValidEventName("1bad")).toBe(false);
    expect(isValidEventName("has space")).toBe(false);
  });
});
