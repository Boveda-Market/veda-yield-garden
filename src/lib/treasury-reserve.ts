/** Treasury SOL reserve thresholds: below LOW, sponsored account activations fail; alert clears at RESTORED. */
export const TREASURY_SOL_LOW = 50_000_000n; // 0.05 SOL
export const TREASURY_SOL_RESTORED = 100_000_000n; // 0.10 SOL

/** Decides the operator alert transition given the previous alerted flag. */
export function treasuryReserveAlert(lamports: bigint, alerted: boolean): "low" | "restored" | null {
  if (!alerted && lamports < TREASURY_SOL_LOW) return "low";
  if (alerted && lamports >= TREASURY_SOL_RESTORED) return "restored";
  return null;
}
