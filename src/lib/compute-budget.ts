import { ComputeBudgetProgram, type TransactionInstruction } from "@solana/web3.js";

/** Modest fixed priority price; an explicit price stops wallets adding inflated congestion fees. */
export const PRIORITY_MICRO_LAMPORTS = 20_000;
export const MAX_COMPUTE_UNITS = 1_400_000;

/** Simulated usage plus a 25% margin and 20k buffer, capped at the network maximum. */
export function computeLimit(unitsConsumed: number | undefined | null): number {
  if (!unitsConsumed || unitsConsumed <= 0) return MAX_COMPUTE_UNITS;
  return Math.min(MAX_COMPUTE_UNITS, Math.ceil(unitsConsumed * 1.25) + 20_000);
}

export function computeBudgetIxs(units: number): TransactionInstruction[] {
  return [ComputeBudgetProgram.setComputeUnitLimit({ units }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICRO_LAMPORTS })];
}
