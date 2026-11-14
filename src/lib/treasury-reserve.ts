/** Treasury SOL reserve thresholds: below LOW, sponsored account activations fail; alert clears at RESTORED. */
export const TREASURY_SOL_LOW = 3_000_000n; // 0.003 SOL
export const TREASURY_SOL_RESTORED = 6_000_000n; // 0.006 SOL

/** Decides the operator alert transition given the previous alerted flag. */
export function treasuryReserveAlert(lamports: bigint, alerted: boolean): "low" | "restored" | null {
  if (!alerted && lamports < TREASURY_SOL_LOW) return "low";
  if (alerted && lamports >= TREASURY_SOL_RESTORED) return "restored";
  return null;
}
