// Multi-touch attribution: share each conversion's credit (1 per conversion,
// or its revenue) across the visitor's touches before it. Pure and unit-tested.

export type Touch = { ts: number; source: string; medium: string; campaign: string };
export type Conversion = { ts: number; visitor: string; value: number };
export type Model = "first" | "last" | "lastNonDirect" | "linear" | "timeDecay" | "position";

export const MODELS: { id: Model; label: string; description: string }[] = [
  { id: "first", label: "First touch", description: "All credit to the first touch." },
  { id: "last", label: "Last touch", description: "All credit to the touch right before converting." },
  { id: "lastNonDirect", label: "Last non-direct", description: "Last touch, skipping direct visits (GA4's usual view)." },
  { id: "linear", label: "Linear", description: "Equal credit to every touch." },
  { id: "timeDecay", label: "Time decay", description: "More credit to recent touches (7-day half-life)." },
  { id: "position", label: "Position-based", description: "40% first, 40% last, 20% shared by the middle." },
];

const DAY = 86_400_000;
const HALF_LIFE_DAYS = 7;

export const isDirect = (t: Touch) => t.source === "(direct)";

// Weight per touch (summing to 1) for one path, oldest first.
export function weights(path: Touch[], model: Model, convertedAt: number): number[] {
  const n = path.length;
  if (n === 0) return [];
  const w = new Array<number>(n).fill(0);
  switch (model) {
    case "first":
      w[0] = 1;
      break;
    case "last":
      w[n - 1] = 1;
      break;
    case "lastNonDirect": {
      let i = n - 1;
      while (i > 0 && isDirect(path[i])) i--;
      w[i] = 1;
      break;
    }
    case "linear":
      w.fill(1 / n);
      break;
    case "timeDecay": {
      const raw = path.map((t) => Math.pow(0.5, (convertedAt - t.ts) / DAY / HALF_LIFE_DAYS));
      const sum = raw.reduce((a, b) => a + b, 0);
      raw.forEach((r, i) => (w[i] = r / sum));
      break;
    }
    case "position":
      if (n === 1) w[0] = 1;
      else if (n === 2) {
        w[0] = 0.5;
        w[1] = 0.5;
      } else {
        w[0] = 0.4;
        w[n - 1] = 0.4;
        for (let i = 1; i < n - 1; i++) w[i] = 0.2 / (n - 2);
      }
      break;
  }
  return w;
}

export type Credit = Record<Model, { conversions: number; revenue: number }>;
export type Row = { key: string; credit: Credit };
export type AttributionResult = {
  conversions: number;
  revenue: number;
  unattributed: number; // conversions with no recorded touch
  avgTouches: number;
  avgDays: number;
  byChannel: Row[];
  byCampaign: Row[];
  paths: { path: string; conversions: number; revenue: number }[];
};

const emptyCredit = (): Credit =>
  Object.fromEntries(MODELS.map((m) => [m.id, { conversions: 0, revenue: 0 }])) as Credit;

// `touches` per visitor, oldest first. Only touches within `lookbackDays`
// before a conversion (and not after it) count toward it.
export function attribute(
  conversions: Conversion[],
  touches: Map<string, Touch[]>,
  lookbackDays: number
): AttributionResult {
  const channels = new Map<string, Credit>();
  const campaigns = new Map<string, Credit>();
  const paths = new Map<string, { conversions: number; revenue: number }>();
  let unattributed = 0;
  let touchSum = 0;
  let daySum = 0;
  let attributed = 0;
  let revenue = 0;

  for (const c of conversions) {
    revenue += c.value;
    const path = (touches.get(c.visitor) ?? []).filter((t) => t.ts <= c.ts && t.ts >= c.ts - lookbackDays * DAY);
    if (path.length === 0) {
      unattributed++;
      continue;
    }
    attributed++;
    touchSum += path.length;
    daySum += (c.ts - path[0].ts) / DAY;
    const label = path.map((t) => `${t.source} / ${t.medium}`).join(" > ");
    const p = paths.get(label) ?? { conversions: 0, revenue: 0 };
    p.conversions++;
    p.revenue += c.value;
    paths.set(label, p);

    for (const m of MODELS) {
      const w = weights(path, m.id, c.ts);
      path.forEach((t, i) => {
        if (!w[i]) return;
        for (const [map, key] of [
          [channels, `${t.source} / ${t.medium}`],
          [campaigns, t.campaign || "(no campaign)"],
        ] as const) {
          const credit = map.get(key) ?? emptyCredit();
          credit[m.id].conversions += w[i];
          credit[m.id].revenue += w[i] * c.value;
          map.set(key, credit);
        }
      });
    }
  }

  const rows = (map: Map<string, Credit>) =>
    [...map.entries()]
      .map(([key, credit]) => ({ key, credit }))
      .sort((a, b) => b.credit.linear.conversions - a.credit.linear.conversions);

  return {
    conversions: conversions.length,
    revenue,
    unattributed,
    avgTouches: attributed ? touchSum / attributed : 0,
    avgDays: attributed ? daySum / attributed : 0,
    byChannel: rows(channels),
    byCampaign: rows(campaigns),
    paths: [...paths.entries()]
      .map(([path, v]) => ({ path, ...v }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 25),
  };
}
