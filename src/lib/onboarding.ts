// New-user funding guide. Thresholds in integer base units.
/** SOL needed to pay network costs for a first deposit (matches the deposit pre-check). */
export const MIN_SOL_LAMPORTS = 15_000_000n;
/** Smallest vault deposit, in micro-USDC. */
export const MIN_USDC_MICRO = 1_000_000n;

export type OnboardingStep = "sol" | "usdc" | null;

/** Parses a non-negative decimal string (as returned by the wallet read) to base units. */
export function decimalToUnits(value: string, decimals: number): bigint | null {
  const v = value.trim();
  if (!/^\d+(\.\d+)?$/.test(v)) return null;
  const [whole, frac = ""] = v.split(".");
  return BigInt(whole ?? "0") * 10n ** BigInt(decimals) + BigInt(frac.slice(0, decimals).padEnd(decimals, "0"));
}

/** Which funding step a wallet still needs: SOL first (network costs), then USDC. */
export function onboardingStep(solLamports: bigint, usdcMicro: bigint): OnboardingStep {
  if (solLamports < MIN_SOL_LAMPORTS) return "sol";
  if (usdcMicro < MIN_USDC_MICRO) return "usdc";
  return null;
}
