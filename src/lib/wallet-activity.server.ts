import { PublicKey } from "@solana/web3.js";
import { heliusConnection } from "./solana-read.server";
import type { WalletActivity } from "./wallet-activity.functions";

export async function readWalletActivity(key: string, wallet: string): Promise<WalletActivity[]> {
  const rows = await heliusConnection(key).getSignaturesForAddress(new PublicKey(wallet), { limit: 20 }, "confirmed");
  return rows.map((row) => ({ signature: row.signature, at: row.blockTime ? row.blockTime * 1000 : null, failed: row.err !== null, status: row.confirmationStatus ?? "confirmed" }));
}