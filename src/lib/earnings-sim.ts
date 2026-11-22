/** Amounts offered by the "Simular ganancias" calculator for new accounts. */
export const SIM_PRESETS = [20, 100, 500, 1000] as const;
export const SIM_MIN_USD = 20;
export const SIM_MAX_USD = 2500;

/**
 * Estimated gross interest for a hypothetical deposit at a pool's current simple APR
 * (reported 24h fees / TVL × 365). No compounding, no price moves, never a promise.
 */
export function simulateEarnings(amountUsd: number, apr: number | null): { perDay: number; perMonth: number } | null {
  if (apr == null || !Number.isFinite(apr) || apr < 0 || !Number.isFinite(amountUsd) || amountUsd <= 0) return null;
  const perDay = amountUsd * (apr / 100) / 365;
  return { perDay, perMonth: perDay * 30 };
}
