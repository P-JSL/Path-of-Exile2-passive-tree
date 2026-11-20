/** Frame timing utilities. Values are diagnostics, not a hardware benchmark. */
export function percentile95(samples) {
  if (!samples.length) return null;
  const sorted = samples.filter(Number.isFinite).sort((a,b)=>a-b);
  if (!sorted.length) return null;
  return sorted[Math.ceil(.95 * sorted.length) - 1];
}
export function pushFrameSample(samples, value, limit = 90) {
  if (!Number.isFinite(value) || value < 0) return;
  samples.push(value);
  if (samples.length > limit) samples.splice(0,samples.length-limit);
}
