import { Buffer } from "buffer";
import { PublicKey, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { CP_AMM_PROGRAM_ID, cpAmmCoder } from "@meteora-ag/cp-amm-sdk/dist/index.js";
import { CHAIN_POOLS } from "./solana-data";
import { heliusConnection, MAX_TX_VERSION } from "./solana-read.server";
import type { MeteoraHistoryPage, MeteoraRecord } from "./meteora-history";
import { tokenDelta, type VaultFlow } from "./since-deposit";
import { FEE_WALLET } from "./fees";
import { USDC_MINT } from "./solana-data";

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

const DLMM_PROGRAM_ID = "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo";
const DLMM_CLAIM_FEE = "4b7a9a308c4a7ba3", DLMM_CLAIM_FEE2 = "e8abf2613a4d232d", DLMM_REBALANCING = "006d75b33d5bc7c8";
const DLMM_ADD_LIQUIDITY = "1f5e7d5ae3343dba", DLMM_REMOVE_LIQUIDITY = "74f461e8671f983a";

/**
 * Concentrated-liquidity (GTA6) harvest events: ClaimFee/ClaimFee2 (manual or autopilot harvest) and the fees
 * collected inside a Rebalancing. One claim emits both ClaimFee and ClaimFee2 with the same amounts, so ClaimFee
 * is only kept when no ClaimFee2 exists for that position in the transaction. Token X = vault token, Y = USDC.
 */
export function decodeDlmmRecords(events: { id: string; data: Buffer }[], wallet: string, meta: { signature: string; at: number | null; slot: number; auto?: boolean }): MeteoraRecord[] {
  const parsed: { id: string; tag: string; pool: string; position: string; x: bigint; y: bigint }[] = [];
  for (const { id, data } of events) {
    if (data.length < 16 || data.subarray(0, 8).toString("hex") !== "e445a52e51cb9a1d") continue;
    const tag = data.subarray(8, 16).toString("hex"), d = data.subarray(16);
    if (![DLMM_CLAIM_FEE, DLMM_CLAIM_FEE2, DLMM_REBALANCING].includes(tag) || d.length < 112) continue;
    const key = (o: number) => new PublicKey(d.subarray(o, o + 32)).toBase58();
    if (key(64) !== wallet) continue;
    const pool = key(0);
    if (!CHAIN_POOLS.some((c) => c.kind === "dlmm" && c.pool === pool)) continue;
    if (tag === DLMM_REBALANCING) { if (d.length < 148) continue; parsed.push({ id, tag, pool, position: key(32), x: d.readBigUInt64LE(132), y: d.readBigUInt64LE(140) }); }
    else parsed.push({ id, tag, pool, position: key(32), x: d.readBigUInt64LE(96), y: d.readBigUInt64LE(104) });
  }
  return parsed.filter((e) => !(e.tag === DLMM_CLAIM_FEE && parsed.some((o) => o.tag === DLMM_CLAIM_FEE2 && o.position === e.position)))
    .filter((e) => meta.auto || e.x > 0n || e.y > 0n)
    .map((e) => ({ id: e.id, signature: meta.signature, at: meta.at, slot: meta.slot, pool: e.pool, position: e.position, kind: "harvest" as const, tokenRaw: e.x.toString(), usdcRaw: e.y.toString(), ...(meta.auto ? { auto: true } : {}) }));
}

export function decodeMeteoraRecords(tx: ParsedTransactionWithMeta, wallet: string, signature: string): MeteoraRecord[] {
  if (!tx.meta || tx.meta.err !== null || tx.transaction.signatures[0] !== signature) return [];
  const records: MeteoraRecord[] = [];
  const dlmm: { id: string; data: Buffer }[] = [];
  for (const group of tx.meta.innerInstructions ?? []) for (const [index, ix] of group.instructions.entries()) {
    if (ix.programId.toBase58() === DLMM_PROGRAM_ID && "data" in ix) { try { dlmm.push({ id: `${signature}:${group.index}:${index}`, data: decode58(ix.data) }); } catch { /* not an event */ } }
  }
  records.push(...decodeDlmmRecords(dlmm, wallet, { signature, at: tx.blockTime ? tx.blockTime * 1000 : null, slot: tx.slot, auto: (tx.meta.logMessages ?? []).some((l) => l.includes("boveda:autopilot")) }));
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

/**
 * Dollar flow of one owner transaction that touched a validated vault (DLMM AddLiquidity/RemoveLiquidity/Rebalancing
 * by this owner, or any decoded record). Fee-wallet USDC is added back so fees never count as deposited.
 */
export function decodeVaultFlow(tx: ParsedTransactionWithMeta, wallet: string, signature: string, records: MeteoraRecord[]): VaultFlow | null {
  if (!tx.meta || tx.meta.err !== null || tx.transaction.signatures[0] !== signature) return null;
  let add = false, remove = false, rebalance = false;
  for (const group of tx.meta.innerInstructions ?? []) for (const ix of group.instructions) {
    if (ix.programId.toBase58() !== DLMM_PROGRAM_ID || !("data" in ix)) continue;
    let data: Buffer; try { data = decode58(ix.data); } catch { continue; }
    if (data.length < 128 || data.subarray(0, 8).toString("hex") !== "e445a52e51cb9a1d") continue;
    const tag = data.subarray(8, 16).toString("hex"), d = data.subarray(16);
    const key = (o: number) => new PublicKey(d.subarray(o, o + 32)).toBase58();
    if (!CHAIN_POOLS.some((c) => c.kind === "dlmm" && c.pool === key(0))) continue;
    if (tag === DLMM_ADD_LIQUIDITY && key(32) === wallet) add = true;
    else if (tag === DLMM_REMOVE_LIQUIDITY && key(32) === wallet) remove = true;
    else if (tag === DLMM_REBALANCING && key(64) === wallet) rebalance = true;
  }
  if (!add && !remove && !rebalance && records.length === 0) return null;
  const { preTokenBalances: pre, postTokenBalances: post } = tx.meta;
  const cash = tokenDelta(pre, post, wallet, USDC_MINT) + tokenDelta(pre, post, FEE_WALLET, USDC_MINT);
  const tokens = CHAIN_POOLS.map((p) => ({ pool: p.pool, raw: tokenDelta(pre, post, wallet, p.mint).toString() })).filter((t) => t.raw !== "0");
  return { signature, slot: tx.slot, at: tx.blockTime ? tx.blockTime * 1000 : null, cashMicro: cash.toString(), tokens,
    harvestOnly: !add && !remove && !rebalance && records.length > 0 && records.every((r) => r.kind === "harvest"),
    hasWithdraw: remove || records.some((r) => r.kind === "withdraw" || r.kind === "close") };
}

/** Bump when decoding changes so cached results are re-read. */
export const DECODER_VERSION = 1;
type Decoded = { records: MeteoraRecord[]; flow: VaultFlow | null };
export type HistoryCache = { get: (wallet: string, signatures: string[]) => Promise<Map<string, Decoded>>; put: (wallet: string, rows: { signature: string; decoded: Decoded }[]) => Promise<void> };

/** Finalized transactions never change, so decoded results are kept server-side (service-role-only table) and each one is read from the network once. */
async function cloudCache(): Promise<HistoryCache | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return {
      get: async (wallet, signatures) => {
        const map = new Map<string, Decoded>();
        if (!signatures.length) return map;
        const { data } = await supabaseAdmin.from("vault_tx_cache").select("signature, records, flow").eq("wallet", wallet).eq("decoder", DECODER_VERSION).in("signature", signatures);
        for (const row of data ?? []) map.set(row.signature, { records: row.records as unknown as MeteoraRecord[], flow: (row.flow ?? null) as unknown as VaultFlow | null });
        return map;
      },
      put: async (wallet, rows) => {
        if (!rows.length) return;
        await supabaseAdmin.from("vault_tx_cache").upsert(rows.map((r) => ({ wallet, signature: r.signature, decoder: DECODER_VERSION, records: r.decoded.records as never, flow: r.decoded.flow as never })), { onConflict: "wallet,signature" });
      },
    };
  } catch { return null; }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function readMeteoraHistory(key: string, wallet: string, before?: string, cacheArg?: HistoryCache | null): Promise<MeteoraHistoryPage> {
  const connection = heliusConnection(key);
  const owner = new PublicKey(wallet);
  const signatures = await connection.getSignaturesForAddress(owner, { limit: 50, ...(before ? { before } : {}) }, "finalized");
  const cache = cacheArg === undefined ? await cloudCache() : cacheArg;
  const ok = signatures.filter((row) => row.err === null).map((row) => row.signature);
  const cached = cache ? await cache.get(wallet, ok).catch(() => new Map<string, Decoded>()) : new Map<string, Decoded>();
  const records: MeteoraRecord[] = [];
  const flows: VaultFlow[] = [];
  const fresh: { signature: string; decoded: Decoded }[] = [];
  let missing = 0;
  const keep = (decoded: Decoded) => { records.push(...decoded.records); if (decoded.flow) flows.push(decoded.flow); };
  for (const sig of ok) { const hit = cached.get(sig); if (hit) keep(hit); }
  const todo = ok.filter((sig) => !cached.has(sig));
  // Bounded concurrency; a busy reply is retried twice with backoff so one rate limit never hides the history.
  for (let start = 0; start < todo.length; start += 4) {
    await Promise.all(todo.slice(start, start + 4).map(async (signature) => {
      let tx: ParsedTransactionWithMeta | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try { tx = await connection.getParsedTransaction(signature, { commitment: "finalized", maxSupportedTransactionVersion: MAX_TX_VERSION }); break; }
        catch { if (attempt < 2) await pause(400 * 3 ** attempt); }
      }
      if (!tx) { missing++; return; }
      try {
        const found = decodeMeteoraRecords(tx, wallet, signature);
        const decoded = { records: found, flow: decodeVaultFlow(tx, wallet, signature, found) };
        keep(decoded); fresh.push({ signature, decoded });
      } catch { missing++; }
    }));
  }
  if (cache) await cache.put(wallet, fresh).catch(() => undefined);
  return { records: records.sort((a, b) => b.slot - a.slot), flows, scanned: signatures.length, next: signatures.length === 50 ? signatures.at(-1)?.signature ?? null : null, missing };
}
