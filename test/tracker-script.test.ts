import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { trackerScript } from "@/lib/tracker-script";

// Runs the tracker in a minimal fake browser and returns what it sent.
function run(opts: { search?: string; referrer?: string; dl?: unknown[] }) {
  const sent: Record<string, unknown>[] = [];
  const store: Record<string, string> = {};
  const win: { dataLayer: unknown[]; localStorage: unknown } = {
    dataLayer: opts.dl ?? [],
    localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => (store[k] = v) },
  };
  vm.runInNewContext(trackerScript({ key: "k".repeat(20), endpoint: "/api/collect", events: ["generate_lead", "purchase"] }), {
    window: win,
    document: { referrer: opts.referrer ?? "" },
    location: { search: opts.search ?? "", hostname: "shop.com", pathname: "/p" },
    navigator: { sendBeacon: (_u: string, b: string) => (sent.push(JSON.parse(b)), true) },
    URLSearchParams, URL, JSON, Date, Math, parseFloat, isFinite, fetch: () => {},
  });
  return { sent, win };
}

describe("tracker script", () => {
  it("records a campaign touch when there's no consent mode", () => {
    const { sent } = run({ search: "?utm_source=facebook&utm_medium=paid_social&utm_campaign=summer" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: "touch", s: "facebook", m: "paid_social", c: "summer" });
  });

  it("waits for analytics consent, then sends the touch and queued conversions", () => {
    const { sent, win } = run({ search: "?gclid=abc", dl: [["consent", "default", { analytics_storage: "denied" }]] });
    win.dataLayer.push({ event: "purchase", ecommerce: { value: "49.90", currency: "USD", transaction_id: "T1" } });
    expect(sent).toHaveLength(0);
    win.dataLayer.push(["consent", "update", { analytics_storage: "granted" }]);
    expect(sent.map((x) => x.type)).toEqual(["touch", "conversion"]);
    expect(sent[0]).toMatchObject({ s: "google", m: "cpc", id: "gclid" });
    expect(sent[1]).toMatchObject({ e: "purchase", value: 49.9, cur: "USD", txn: "T1" });
  });

  it("classifies organic search and catches gtag-style leads only", () => {
    const { sent, win } = run({ referrer: "https://www.google.com/" });
    win.dataLayer.push(["event", "generate_lead", {}]);
    win.dataLayer.push({ event: "page_view" });
    expect(sent.map((x) => [x.type, x.s ?? x.e])).toEqual([["touch", "google"], ["conversion", "generate_lead"]]);
    expect(sent[0].m).toBe("organic");
  });
});
