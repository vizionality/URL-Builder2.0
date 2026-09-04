// Credit-assignment models. Each takes an ordered touch path (oldest first) and
// returns a fractional credit per touch that sums to 1.0. Trend/journey models
// only: how much each touch contributed to the conversion. No mean-reversion.

export type AttributionModel =
  | "first"
  | "last"
  | "linear"
  | "timeDecay"
  | "positionBased";

export const MODEL_LABELS: Record<AttributionModel, string> = {
  first: "First touch",
  last: "Last touch",
  linear: "Linear",
  timeDecay: "Time decay",
  positionBased: "Position based",
};

export function firstTouch(n: number): number[] {
  if (n <= 0) return [];
  const out = new Array(n).fill(0);
  out[0] = 1;
  return out;
}

export function lastTouch(n: number): number[] {
  if (n <= 0) return [];
  const out = new Array(n).fill(0);
  out[n - 1] = 1;
  return out;
}

export function linear(n: number): number[] {
  if (n <= 0) return [];
  return new Array(n).fill(1 / n);
}

// Position based (U-shaped): 40% first, 40% last, 20% split across the middle.
export function positionBased(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1];
  if (n === 2) return [0.5, 0.5];
  const out = new Array(n).fill(0.2 / (n - 2));
  out[0] = 0.4;
  out[n - 1] = 0.4;
  return out;
}

// Time decay: a touch closer to the conversion gets more credit, halving every
// halfLifeDays. touchTimesMs oldest first; convTimeMs is the conversion instant.
export function timeDecay(
  touchTimesMs: number[],
  convTimeMs: number,
  halfLifeDays = 7
): number[] {
  const n = touchTimesMs.length;
  if (n === 0) return [];
  const dayMs = 86_400_000;
  const weights = touchTimesMs.map((t) => {
    const ageDays = Math.max(0, (convTimeMs - t) / dayMs);
    return Math.pow(2, -ageDays / halfLifeDays);
  });
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return linear(n);
  return weights.map((w) => w / total);
}

// Dispatch: return credit for one path under the chosen model.
export function creditFor(
  model: AttributionModel,
  touchTimesMs: number[],
  convTimeMs: number,
  halfLifeDays = 7
): number[] {
  const n = touchTimesMs.length;
  switch (model) {
    case "first":
      return firstTouch(n);
    case "last":
      return lastTouch(n);
    case "linear":
      return linear(n);
    case "positionBased":
      return positionBased(n);
    case "timeDecay":
      return timeDecay(touchTimesMs, convTimeMs, halfLifeDays);
  }
}
