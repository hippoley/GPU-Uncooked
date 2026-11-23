/**
 * GPU Kitchen conceptual steady-state capacity model.
 * This is a teaching analogy, NOT a GPU simulator or measured hardware performance.
 */
export function simulate({ cooks, cookSeconds, ingredientRate, orders }) {
  for (const value of [cooks, cookSeconds, ingredientRate, orders]) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError("Inputs must be finite and positive");
  }
  const computeCapacity = cooks / cookSeconds;
  const throughput = Math.min(computeCapacity, ingredientRate);
  const computeUtilization = throughput / computeCapacity;
  const ingredientUtilization = throughput / ingredientRate;
  const bottleneck = computeCapacity < ingredientRate ? "compute" :
    computeCapacity > ingredientRate ? "supply" : "balanced";
  return { computeCapacity, ingredientRate, throughput, computeUtilization,
    ingredientUtilization, bottleneck, estimatedSeconds: orders / throughput,
    idealSpeedup: computeCapacity / (1 / cookSeconds) };
}
export function roofline({ arithmeticIntensity, peakCompute, peakBandwidth }) {
  for (const value of [arithmeticIntensity, peakCompute, peakBandwidth]) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError("Roofline inputs must be positive");
  }
  return { attainable: Math.min(peakCompute, arithmeticIntensity * peakBandwidth),
    ridgePoint: peakCompute / peakBandwidth,
    bound: arithmeticIntensity * peakBandwidth < peakCompute ? "memory" : "compute" };
}
