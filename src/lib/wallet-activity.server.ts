import { PublicKey } from "@solana/web3.js";
import { heliusConnection, MAX_TX_VERSION } from "./solana-read.server";
import { classifyActivity, type WalletActivity } from "./wallet-activity";

export async function readWalletActivity(key: string, wallet: string): Promise<WalletActivity[]> {
  const connection = heliusConnection(key);
  const rows = await connection.getSignaturesForAddress(new PublicKey(wallet), { limit: 20 }, "confirmed");
  // One request per signature (small batches) so a single slow or oversized reply cannot blank every label.
  const txs: Array<{ meta: { logMessages?: string[] | null } | null } | null> = [];
  for (let i = 0; i < rows.length; i += 5) {
    const part = await Promise.all(rows.slice(i, i + 5).map((r) => connection.getTransaction(r.signature, { commitment: "confirmed", maxSupportedTransactionVersion: MAX_TX_VERSION }).catch(() => null)));
    txs.push(...part);
  }
  // Rebalances sent before the on-chain tag existed: the last Autopilot signature is kept server-side.
  let autoSig: string | null = null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("autopilot_enrollments").select("last_signature").eq("wallet", wallet).maybeSingle();
    autoSig = (data as { last_signature?: string | null } | null)?.last_signature ?? null;
  } catch { /* labels still work from the on-chain tag */ }
  return rows.map((row, i) => {
    const kind = classifyActivity(txs[i]?.meta?.logMessages ?? []);
    return { signature: row.signature, at: row.blockTime ? row.blockTime * 1000 : null, failed: row.err !== null, status: row.confirmationStatus ?? "confirmed", kind: row.signature === autoSig && kind === "vault_rebalance" ? "autopilot_compound" : kind };
  });
}
