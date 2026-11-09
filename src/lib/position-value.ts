/** Estimated USD value of token + USDC amounts. Returns null when any input is unavailable. */
export function estimateUsd(token: string | null, usdc: string | null, price: number | null): number | null {
  if (token === null || usdc === null || price === null) return null;
  const t = Number(token), u = Number(usdc);
  if (!Number.isFinite(t) || !Number.isFinite(u) || t < 0 || u < 0 || !(price > 0)) return null;
  return t * price + u;
}

export function formatUsd(value: number): string {
  if (value > 0 && value < 0.01) return "<$0.01";
  return `$${value.toFixed(2)}`;
}
