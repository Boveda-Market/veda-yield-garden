import { PublicKey } from "@solana/web3.js";
import { heliusConnection } from "./solana-read.server";
import { classifyActivity, type WalletActivity } from "./wallet-activity";

export async function readWalletActivity(key: string, wallet: string): Promise<WalletActivity[]> {
  const connection = heliusConnection(key);
  const rows = await connection.getSignaturesForAddress(new PublicKey(wallet), { limit: 20 }, "confirmed");
  // One request per signature (small batches) so a single slow or oversized reply cannot blank every label.
  const txs: Array<{ meta: { logMessages?: string[] | null } | null } | null> = [];
  for (let i = 0; i < rows.length; i += 5) {
    const part = await Promise.all(rows.slice(i, i + 5).map((r) => connection.getTransaction(r.signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 }).catch(() => null)));
    txs.push(...part);
  }
  return rows.map((row, i) => ({ signature: row.signature, at: row.blockTime ? row.blockTime * 1000 : null, failed: row.err !== null, status: row.confirmationStatus ?? "confirmed", kind: classifyActivity(txs[i]?.meta?.logMessages ?? []) }));
}
