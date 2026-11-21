/** Deterministic display-only kitchen flow. Not a GPU or discrete event simulator. */
export function advanceScene(state, parameters, dt) {
  if (!Number.isFinite(dt) || dt < 0) throw new RangeError("dt must be nonnegative");
  const { cooks, cookSeconds, ingredientRate, orders } = parameters;
  const computeCapacity = cooks / cookSeconds;
  const throughput = Math.min(computeCapacity, ingredientRate);
  const elapsed = state.elapsed + dt;
  const completed = Math.min(orders, throughput * elapsed);
  const activeCooks = Math.min(cooks, Math.ceil(throughput * cookSeconds));
  return {
    elapsed, completed, remaining: Math.max(0, Math.ceil(orders - completed)),
    activeCooks, waitingCooks: cooks - activeCooks,
    supplyPerSecond: ingredientRate, throughput,
    finished: completed >= orders,
    progress: completed / orders
  };
}
export const initialScene = () => ({ elapsed: 0, completed: 0 });
