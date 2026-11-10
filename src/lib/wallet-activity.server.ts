import { PublicKey } from "@solana/web3.js";
import { heliusConnection } from "./solana-read.server";
import { classifyActivity, type WalletActivity } from "./wallet-activity";

export async function readWalletActivity(key: string, wallet: string): Promise<WalletActivity[]> {
  const connection = heliusConnection(key);
  const rows = await connection.getSignaturesForAddress(new PublicKey(wallet), { limit: 20 }, "confirmed");
  let txs: Array<{ meta: { logMessages?: string[] | null } | null } | null> = [];
  try { txs = await connection.getTransactions(rows.map((r) => r.signature), { commitment: "confirmed", maxSupportedTransactionVersion: 0 }); } catch { txs = []; }
  return rows.map((row, i) => ({ signature: row.signature, at: row.blockTime ? row.blockTime * 1000 : null, failed: row.err !== null, status: row.confirmationStatus ?? "confirmed", kind: classifyActivity(txs[i]?.meta?.logMessages ?? []) }));
}
