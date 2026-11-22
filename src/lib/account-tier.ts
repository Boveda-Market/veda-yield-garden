import { FEE_TIERS } from "./fees";

/** Account level from total Bóveda Market balance in USD (vault capital + wallet USDC), using the same thresholds as fee tiers. */
export function accountTier(usd: number) {
  const units = BigInt(Math.max(0, Math.floor(usd * 1_000_000)));
  let i = 0;
  FEE_TIERS.forEach((t, k) => { if (units >= t.min) i = k; });
  const tier = FEE_TIERS[i] ?? FEE_TIERS[0];
  const next = FEE_TIERS[i + 1] ?? null;
  const from = Number(tier.min) / 1_000_000;
  const to = next ? Number(next.min) / 1_000_000 : null;
  const progress = to === null ? 100 : Math.min(100, Math.max(0, ((usd - from) / (to - from)) * 100));
  return { name: tier.name, index: i, next: next?.name ?? null, missing: to === null ? 0 : Math.max(0, to - usd), progress };
}
