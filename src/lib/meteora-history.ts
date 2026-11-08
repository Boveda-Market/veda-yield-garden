import { z } from "zod";
import { CHAIN_POOLS, realWalletInput, tokenAmount } from "./solana-data";

export const meteoraHistoryInput = realWalletInput.extend({ before: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/).optional() }).strict();
export type MeteoraRecord = { id: string; signature: string; at: number | null; slot: number; pool: string; position: string; kind: "deposit" | "withdraw" | "harvest" | "close"; tokenRaw: string; usdcRaw: string };
export type MeteoraHistoryPage = { records: MeteoraRecord[]; scanned: number; next: string | null; missing: number };

export function meteoraMetrics(records: MeteoraRecord[]) {
  const unique = [...new Map(records.map((row) => [row.id, row])).values()];
  const totals = CHAIN_POOLS.map((pool) => {
    const rows = unique.filter((row) => row.pool === pool.pool);
    const sum = (kind: MeteoraRecord["kind"], field: "tokenRaw" | "usdcRaw") => rows.filter((row) => row.kind === kind).reduce((total, row) => total + BigInt(row[field]), 0n);
    return { ...pool, depositToken: sum("deposit", "tokenRaw"), depositUsdc: sum("deposit", "usdcRaw"), harvestToken: sum("harvest", "tokenRaw"), harvestUsdc: sum("harvest", "usdcRaw"), withdrawToken: sum("withdraw", "tokenRaw"), withdrawUsdc: sum("withdraw", "usdcRaw"), count: rows.length };
  });
  const deposited = totals.reduce((sum, row) => sum + row.depositUsdc, 0n);
  const harvested = totals.reduce((sum, row) => sum + row.harvestUsdc, 0n);
  return { totals, deposited: tokenAmount(deposited.toString(), 6), harvested: tokenAmount(harvested.toString(), 6), usdcHarvestPercent: deposited > 0n ? Number(harvested * 100_000_000n / deposited) / 1_000_000 : null, count: unique.length };
}