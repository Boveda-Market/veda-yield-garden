import { z } from "zod";
import { CHAIN_POOLS } from "@/lib/solana-data";

/** Public read-only host for a pool: concentrated-liquidity pools publish on their own data API. */
export function poolDataHost(address: string) {
  return CHAIN_POOLS.some((p) => p.pool === address && p.kind === "dlmm") ? "dlmm.datapi.meteora.ag" : "damm-v2.datapi.meteora.ag";
}

const candle = z.object({ close: z.number().finite().positive() });
const candles = z.object({ data: z.array(candle).nullish().catch(null) });
const protocolMetrics = z.object({ total_tvl: z.number().finite().positive().nullish().catch(null) });

export type PoolVolatility = { volPct: number | null; days: number };

/**
 * Typical daily price swing: the spread of day-to-day percentage changes. Needs at least three
 * changes; missing or impossible closes are dropped and the remaining ones compared in order.
 */
export function dailyVolatility(closes: (number | null | undefined)[]): PoolVolatility {
  const clean = closes.filter((c): c is number => typeof c === "number" && Number.isFinite(c) && c > 0);
  const returns: number[] = [];
  for (let i = 1; i < clean.length; i++) {
    const prev = clean[i - 1];
    const cur = clean[i];
    if (prev != null && cur != null) returns.push((cur / prev - 1) * 100);
  }
  if (returns.length < 3) return { volPct: null, days: returns.length };
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const volPct = Math.sqrt(variance);
  return { volPct: Number.isFinite(volPct) ? volPct : null, days: returns.length };
}

/** Daily closes for the last days; empty when the source returns nothing usable. */
export async function fetchPoolCloses(address: string, signal?: AbortSignal): Promise<number[]> {
  const url = `https://${poolDataHost(address)}/pools/${encodeURIComponent(address)}/ohlcv?timeframe=24h&limit=31`;
  const response = await fetch(url, { signal: signal ?? null });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error("No se pudo consultar la volatilidad del pool.");
  const parsed = candles.safeParse(await response.json());
  return (parsed.data?.data ?? []).map((c) => c.close);
}

/** Total money held by every pool of the same protocol, used to show how big this pool is. */
export async function fetchProtocolTvl(address: string, signal?: AbortSignal): Promise<number | null> {
  const response = await fetch(`https://${poolDataHost(address)}/stats/protocol_metrics`, { signal: signal ?? null });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudo consultar el total del protocolo.");
  const parsed = protocolMetrics.safeParse(await response.json());
  return parsed.data?.total_tvl ?? null;
}

/** Pool's share of all the money in the protocol, in percent. */
export function tvlSharePct(tvl: number | null | undefined, protocolTvl: number | null | undefined) {
  if (tvl == null || protocolTvl == null || protocolTvl <= 0 || tvl < 0) return null;
  const pct = tvl / protocolTvl * 100;
  return Number.isFinite(pct) ? pct : null;
}

/** How many times the pool's money changed hands in 24 h, in percent. */
export function turnoverPct(volume24h: number | null | undefined, tvl: number | null | undefined) {
  if (volume24h == null || tvl == null || tvl <= 0 || volume24h < 0) return null;
  const pct = volume24h / tvl * 100;
  return Number.isFinite(pct) ? pct : null;
}

export const poolVolatilityOptions = (address: string) => ({
  queryKey: ["meteora-pool-volatility", address],
  queryFn: async ({ signal }: { signal: AbortSignal }) => dailyVolatility(await fetchPoolCloses(address, signal)),
  staleTime: 10 * 60_000,
  retry: 1,
});

export const protocolTvlOptions = (address: string) => ({
  queryKey: ["meteora-protocol-tvl", address],
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchProtocolTvl(address, signal),
  staleTime: 10 * 60_000,
  retry: 1,
});

const flowRow = z.object({
  pool_address: z.string(),
  net_deposits: z.number().finite().nullish().catch(null),
  total_deposits: z.number().finite().nonnegative().nullish().catch(null),
  total_withdraws: z.number().finite().nonnegative().nullish().catch(null),
});
const flowResponse = z.object({ data: z.array(flowRow).nullish().catch(null) });

export type PoolFlow = { netDeposits: number; totalDeposits: number; totalWithdraws: number };

/**
 * Money that came in and went out of the pool. Only the row whose address matches is used, and the
 * figure stays unavailable when the source has no deposits/withdrawals for it — never guessed.
 */
export function parsePoolFlow(json: unknown, address: string): PoolFlow | null {
  const parsed = flowResponse.safeParse(json);
  const row = (parsed.data?.data ?? []).find((r) => r.pool_address === address);
  if (!row) return null;
  const deposits = row.total_deposits;
  const withdraws = row.total_withdraws;
  if (deposits == null || withdraws == null) return null;
  const net = row.net_deposits ?? deposits - withdraws;
  if (!Number.isFinite(net)) return null;
  return { netDeposits: net, totalDeposits: deposits, totalWithdraws: withdraws };
}

/** Public discovery API: the pool's own deposits vs. withdrawals row. */
export async function fetchPoolFlow(address: string, signal?: AbortSignal): Promise<PoolFlow | null> {
  const url = `https://pool-discovery-api.datapi.meteora.ag/pools?page_size=1&category=all&filter_by=${encodeURIComponent(`pool_address=${address}`)}`;
  const response = await fetch(url, { signal: signal ?? null });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudo consultar la entrada y salida de dinero del pool.");
  return parsePoolFlow(await response.json(), address);
}

export const poolFlowOptions = (address: string) => ({
  queryKey: ["meteora-pool-flow", address],
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchPoolFlow(address, signal),
  staleTime: 10 * 60_000,
  retry: 1,
});
