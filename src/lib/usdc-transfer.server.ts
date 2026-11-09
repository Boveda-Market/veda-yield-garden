import { PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { USDC_MINT } from "@/lib/solana-data";
import { heliusConnection } from "@/lib/solana-read.server";

/** Builds an owner-signed USDC transfer and returns it only after a successful simulation. */
export async function prepareUsdcTransfer(apiKey: string, from: string, to: string, amount: bigint) {
  const connection = heliusConnection(apiKey);
  const owner = new PublicKey(from);
  const dest = new PublicKey(to);
  const mint = new PublicKey(USDC_MINT);
  const source = getAssociatedTokenAddressSync(mint, owner);
  const balance = await connection.getTokenAccountBalance(source).catch(() => null);
  if (!balance || BigInt(balance.value.amount) < amount) return { ok: false as const, reason: "balance" };
  // Off-curve destinations are token accounts, not wallets; only wallets are accepted.
  if (!PublicKey.isOnCurve(dest.toBytes())) return { ok: false as const, reason: "address" };
  const destAta = getAssociatedTokenAddressSync(mint, dest);
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  const message = new TransactionMessage({
    payerKey: owner,
    recentBlockhash: blockhash,
    instructions: [
      createAssociatedTokenAccountIdempotentInstruction(owner, destAta, dest, mint),
      createTransferCheckedInstruction(source, mint, destAta, owner, amount, 6),
    ],
  }).compileToV0Message();
  const tx = new VersionedTransaction(message);
  const sim = await connection.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: false });
  if (sim.value.err) return { ok: false as const, reason: "simulation" };
  return { ok: true as const, transaction: Buffer.from(tx.serialize()).toString("base64") };
}
