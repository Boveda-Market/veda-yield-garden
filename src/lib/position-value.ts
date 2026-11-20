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

/** Dollar move in the last 24 h of a vault's coin part: today's coin value minus its value at yesterday's price. Dollars in the vault never move. */
export function change24hUsd(token: string | null, price: number | null, changePct: number | null): number | null {
  if (token === null || price === null || changePct === null || !(price > 0) || changePct <= -100) return null;
  const t = Number(token); if (!Number.isFinite(t) || t < 0) return null;
  const now = t * price;
  return now - now / (1 + changePct / 100);
}
