import { ComputeBudgetProgram, type Connection, type TransactionInstruction, type VersionedMessage } from "@solana/web3.js";

/** Modest fixed priority price; an explicit price stops wallets adding inflated congestion fees. */
export const PRIORITY_MICRO_LAMPORTS = 20_000;
export const MAX_COMPUTE_UNITS = 1_400_000;

/** Simulated usage plus a 25% margin and 20k buffer, capped at the network maximum. */
export function computeLimit(unitsConsumed: number | undefined | null): number {
  if (!unitsConsumed || unitsConsumed <= 0) return MAX_COMPUTE_UNITS;
  return Math.min(MAX_COMPUTE_UNITS, Math.ceil(unitsConsumed * 1.25) + 20_000);
}

/** Small transfers use few units, so the fixed price alone is ignored on a busy network: guarantee ~10,000 lamports of priority. */
export const SMALL_TX_PRIORITY_LAMPORTS = 10_000;
export function smallTxBudgetIxs(units: number): TransactionInstruction[] {
  const price = Math.max(PRIORITY_MICRO_LAMPORTS, Math.ceil(SMALL_TX_PRIORITY_LAMPORTS * 1_000_000 / units));
  return [ComputeBudgetProgram.setComputeUnitLimit({ units }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: price })];
}

export function computeBudgetIxs(units: number): TransactionInstruction[] {
  return [ComputeBudgetProgram.setComputeUnitLimit({ units }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICRO_LAMPORTS })];
}

/** Network fee the protocol charges: 5,000 lamports per signature plus the priority price on the compute limit. */
export function expectedNetworkFee(signatures: number, units: number): bigint {
  return 5_000n * BigInt(signatures) + (BigInt(units) * BigInt(PRIORITY_MICRO_LAMPORTS) + 999_999n) / 1_000_000n;
}

/**
 * Asks the node for the fee; a node that has not seen our fresh blockhash yet answers null,
 * so retry briefly and then fall back to the protocol formula instead of failing the operation.
 */
export async function networkFeeOf(connection: Connection, message: VersionedMessage, units: number): Promise<bigint> {
  for (let i = 0; i < 2; i++) {
    const fee = await connection.getFeeForMessage(message, "confirmed").catch(() => null);
    if (fee?.value != null) return BigInt(fee.value);
    await new Promise((r) => setTimeout(r, 400));
  }
  return expectedNetworkFee(message.header.numRequiredSignatures, units);
}
