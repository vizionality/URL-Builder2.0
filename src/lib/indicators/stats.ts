// Small statistical helpers, pure. Kept deliberately boring so the indicator
// modules read as arithmetic, not framework.

export function mean(values: number[]): number {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return NaN;
  return nums.reduce((s, v) => s + v, 0) / nums.length;
}

export function median(values: number[]): number {
  const nums = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return NaN;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

/** Sample standard deviation (n - 1). Returns 0 for fewer than two points. */
export function stddev(values: number[]): number {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length < 2) return 0;
  const m = mean(nums);
  const variance =
    nums.reduce((s, v) => s + (v - m) * (v - m), 0) / (nums.length - 1);
  return Math.sqrt(variance);
}
