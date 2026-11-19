import { z } from "zod";
import { CHAIN_POOLS, realWalletInput, tokenAmount, vaultDecimals } from "./solana-data";

export const meteoraHistoryInput = realWalletInput.extend({ before: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/).optional() }).strict();
export type MeteoraRecord = { id: string; signature: string; at: number | null; slot: number; pool: string; position: string; kind: "deposit" | "withdraw" | "harvest" | "close"; tokenRaw: string; usdcRaw: string; auto?: boolean };
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

/** Option A PNL: gross harvested USDC plus harvested SOL/MET valued at current price. Null when any needed price is missing. */
export function harvestedUsdValue(totals: { id: string; harvestToken: bigint; harvestUsdc: bigint }[], prices: Record<string, number | null | undefined>) {
  let micro = 0n;
  for (const row of totals) {
    micro += row.harvestUsdc;
    if (row.harvestToken === 0n) continue;
    const price = prices[row.id];
    if (price == null || !Number.isFinite(price) || price <= 0) return null;
    const decimals = BigInt(vaultDecimals(row.id));
    micro += (row.harvestToken * BigInt(Math.round(price * 1_000_000))) / 10n ** decimals;
  }
  return tokenAmount(micro.toString(), 6);
}
