import { FEE_WALLET } from "@/lib/fees";
import { USDC_MINT } from "@/lib/solana-data";

/** Reads a confirmed transaction and returns its fee payer and the USDC credited to BÓVEDA's fee wallet. */
export async function confirmedFeeTransfer(apiKey: string, signature: string) {
  const { heliusConnection } = await import("@/lib/solana-read.server");
  const tx = await heliusConnection(apiKey).getParsedTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
  if (!tx?.meta || tx.meta.err) return null;
  const payer = tx.transaction.message.accountKeys[0]?.pubkey.toBase58();
  if (!payer) return null;
  const mint = USDC_MINT.toString();
  const sum = (list: typeof tx.meta.preTokenBalances) => (list ?? [])
    .filter((b) => b.owner === FEE_WALLET && b.mint === mint)
    .reduce((acc, b) => acc + BigInt(b.uiTokenAmount.amount), 0n);
  const feeRaw = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
  return { payer, feeRaw };
}
