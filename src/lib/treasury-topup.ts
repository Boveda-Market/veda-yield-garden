/** Treasury self-refill rules: the treasury swaps some of its own free dollars into network reserve before it runs dry. */
export const TOPUP_TRIGGER_LAMPORTS = 15_000_000n; // below 0.015 SOL, refill
export const TOPUP_MIN_SOL_LAMPORTS = 2_500_000n; // needs ~0.0025 SOL to pay its own swap (temporary account + fee)
export const TOPUP_COOLDOWN_MS = 4 * 60 * 60_000;
export const TOPUP_LARGE_MICRO = 10_000_000n; // $10
export const TOPUP_SMALL_MICRO = 5_000_000n; // $5

export type TopupDecision = { kind: "swap"; amountMicro: bigint } | { kind: "skip"; reason: "healthy" | "cooldown" | "no-sol" | "no-dollars" };

/** Free dollars = treasury USDC minus pending affiliate commissions (never spent on the refill). */
export function decideTopup(input: { sol: bigint; usdcMicro: bigint; pendingMicro: bigint; lastAt: number | null; now: number; manual?: boolean }): TopupDecision {
  if (!input.manual && input.sol >= TOPUP_TRIGGER_LAMPORTS) return { kind: "skip", reason: "healthy" };
  if (!input.manual && input.lastAt !== null && input.now - input.lastAt < TOPUP_COOLDOWN_MS) return { kind: "skip", reason: "cooldown" };
  if (input.sol < TOPUP_MIN_SOL_LAMPORTS) return { kind: "skip", reason: "no-sol" };
  const free = input.usdcMicro - input.pendingMicro;
  if (free >= TOPUP_LARGE_MICRO) return { kind: "swap", amountMicro: TOPUP_LARGE_MICRO };
  if (free >= TOPUP_SMALL_MICRO) return { kind: "swap", amountMicro: TOPUP_SMALL_MICRO };
  return { kind: "skip", reason: "no-dollars" };
}
