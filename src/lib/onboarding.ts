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

/** Percent chips offered to convert extra SOL into USDC. 100 = everything above the network reserve. */
export const SOL_CONVERT_PERCENTS = [25n, 50n, 75n, 100n] as const;
/** Minimum convertible SOL value (USD) before suggesting the conversion card. */
export const SOL_EXCESS_MIN_USD = 5;
/** Minimum USDC value for the one-tap "Activate my dollars" card after funding. */
export const ACTIVATE_MIN_USD = 0.5;

/** Lamports to convert for a percent of the spendable SOL (balance minus reserve); never touches the reserve. */
export function solConvertLamports(balance: bigint, reserve: bigint, pct: bigint): bigint {
  if (pct <= 0n || balance <= reserve) return 0n;
  const p = pct > 100n ? 100n : pct;
  return (balance - reserve) * p / 100n;
}

/** Formats integer base units as a plain decimal string (dot separator, trimmed). */
export function unitsToDecimal(v: bigint, decimals: number): string {
  const d = 10n ** BigInt(decimals);
  const frac = (v % d).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${v / d}.${frac}` : `${v / d}`;
}

/** Starting SOL card purchase, preset to the card provider minimum (0.19 SOL); extra converts to USDC. */
export const GAS_TOP_UP_SOL = "0.19";
/** Suggested first card purchase, in US dollars (card providers require ~$20 minimum). */
export const STARTER_USD = "20";

/** SOL kept for network costs when auto-converting new funds (covers MIN_SOL_LAMPORTS plus headroom). */
export const GAS_KEEP_LAMPORTS = 20_000_000n;
/** Lamports auto-converted to USDC: everything above the kept network reserve. */
export function autoConvertLamports(balance: bigint): bigint {
  return balance > GAS_KEEP_LAMPORTS ? balance - GAS_KEEP_LAMPORTS : 0n;
}

/** "Add funds" route: wallets that already hold the network reserve buy USDC directly; others buy the starter card package. */
export function fundingAction(solLamports: bigint): "usdc" | "starter" {
  return solLamports >= MIN_SOL_LAMPORTS ? "usdc" : "starter";
}
