import { Buffer } from "buffer";
import { PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { CP_AMM_PROGRAM_ID, cpAmmCoder } from "@meteora-ag/cp-amm-sdk/dist/index.js";
import { CHAIN_POOLS } from "./solana-data";
import { heliusConnection } from "./solana-read.server";
import type { MeteoraHistoryPage, MeteoraRecord } from "./meteora-history";

// Small base58 decoder avoids browser/module interop differences in bs58 exports.
function decode58(value: string) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = 0n;
  for (const c of value) { const digit = alphabet.indexOf(c); if (digit < 0) throw new Error("Base58 inválido"); n = n * 58n + BigInt(digit); }
  const bytes: number[] = [];
  while (n > 0n) { bytes.unshift(Number(n % 256n)); n /= 256n; }
  for (const c of value) { if (c !== "1") break; bytes.unshift(0); }
  return Buffer.from(bytes);
}
const rawAmount = (value: unknown) => { const raw = String(value); if (!/^\d+$/.test(raw)) throw new Error("Importe no válido"); return raw; };
const address = (value: unknown) => new PublicKey(String(value)).toBase58();

export function decodeMeteoraRecords(tx: ParsedTransactionWithMeta, wallet: string, signature: string): MeteoraRecord[] {
  if (!tx.meta || tx.meta.err !== null || tx.transaction.signatures[0] !== signature) return [];
  const records: MeteoraRecord[] = [];
  for (const group of tx.meta.innerInstructions ?? []) {
    for (const [index, ix] of group.instructions.entries()) {
      if (!ix.programId.equals(CP_AMM_PROGRAM_ID) || !("data" in ix)) continue;
      const bytes = decode58(ix.data);
      if (bytes.subarray(0, 8).toString("hex") !== "e445a52e51cb9a1d") continue;
      const event = cpAmmCoder.events.decode(bytes.subarray(8).toString("base64"));
      if (!event || !["EvtLiquidityChange", "EvtClaimPositionFee", "EvtClosePosition"].includes(event.name)) continue;
      const data = event.data as Record<string, unknown>;
      if (address(data["owner"]) !== wallet) continue;
      const pool = address(data["pool"]);
      // Token-2022 event extension accounting remains deliberately unavailable.
      if (!CHAIN_POOLS.some((config) => config.pool === pool)) continue;
      const kind = event.name === "EvtClaimPositionFee" ? "harvest" : event.name === "EvtClosePosition" ? "close" : data["change_type"] === 0 ? "deposit" : data["change_type"] === 1 ? "withdraw" : null;
      if (!kind) throw new Error("Cambio de liquidez desconocido");
      records.push({ id: `${signature}:${group.index}:${index}`, signature, at: tx.blockTime ? tx.blockTime * 1000 : null, slot: tx.slot, pool, position: address(data["position"]), kind,
        tokenRaw: kind === "close" ? "0" : rawAmount(data[kind === "harvest" ? "fee_a_claimed" : "token_a_amount"]),
        usdcRaw: kind === "close" ? "0" : rawAmount(data[kind === "harvest" ? "fee_b_claimed" : "token_b_amount"]) });
    }
  }
  return records;
}

export async function readMeteoraHistory(key: string, wallet: string, before?: string): Promise<MeteoraHistoryPage> {
  const connection = heliusConnection(key);
  const owner = new PublicKey(wallet);
  const signatures = await connection.getSignaturesForAddress(owner, { limit: 25, ...(before ? { before } : {}) }, "finalized");
  const records: MeteoraRecord[] = [];
  let missing = 0;
  // Bounded concurrency and pagination; no unbounded wallet backfill on entry.
  for (let start = 0; start < signatures.length; start += 4) {
    await Promise.all(signatures.slice(start, start + 4).map(async (row) => {
      if (row.err !== null) return;
      try {
        const tx = await connection.getParsedTransaction(row.signature, { commitment: "finalized", maxSupportedTransactionVersion: 0 });
        if (!tx) { missing++; return; }
        records.push(...decodeMeteoraRecords(tx, wallet, row.signature));
      } catch { missing++; }
    }));
  }
  return { records: records.sort((a, b) => b.slot - a.slot), scanned: signatures.length, next: signatures.length === 25 ? signatures.at(-1)?.signature ?? null : null, missing };
}