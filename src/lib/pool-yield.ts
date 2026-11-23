import { z } from "zod";
import { CHAIN_POOLS } from "@/lib/solana-data";

// Optional public metrics: any odd value becomes null so it can never break the verified APR fields.
const num = z.number().finite().nonnegative().nullish().catch(null);
const sym = z.string().max(20).nullish().catch(null);

const schema = z.object({
  address: z.string(),
  tvl: z.number().finite().nonnegative().nullish(),
  fees: z.object({ "24h": z.number().finite().nonnegative().nullish(), "1h": num }).nullish(),
  volume: z.object({ "24h": num, "1h": num }).nullish().catch(null),
  cumulative_metrics: z.object({ volume: num, fees: num }).nullish().catch(null),
  token_x: z.object({ holders: z.number().int().nonnegative().nullish(), symbol: sym }).nullish(),
  token_y: z.object({ symbol: sym }).nullish().catch(null),
  token_x_amount: num,
  token_y_amount: num,
  pool_config: z.object({ base_fee_pct: num }).nullish().catch(null),
  created_at: num,
});

export type PoolYield = NonNullable<ReturnType<typeof parsePoolYield>>;

/** Simple annualization of reported 24h fees / current TVL; no compounding. */
export function parsePoolYield(data: unknown, address: string) {
  const parsed = schema.safeParse(data);
  if (!parsed.success || parsed.data.address !== address) return null;
  const d = parsed.data;
  const tvl = d.tvl ?? null;
  const fees24h = d.fees?.["24h"] ?? null;
  const apr = tvl != null && tvl > 0 && fees24h != null ? fees24h / tvl * 365 * 100 : null;
  return {
    apr: apr != null && Number.isFinite(apr) ? apr : null, fees24h, tvl, holders: d.token_x?.holders ?? null,
    fees1h: d.fees?.["1h"] ?? null,
    volume24h: d.volume?.["24h"] ?? null,
    volume1h: d.volume?.["1h"] ?? null,
    totalFees: d.cumulative_metrics?.fees ?? null,
    totalVolume: d.cumulative_metrics?.volume ?? null,
    /** Token amounts held by the pool (not dollars). */
    amountX: d.token_x_amount ?? null,
    amountY: d.token_y_amount ?? null,
    symbolX: d.token_x?.symbol ?? null,
    symbolY: d.token_y?.symbol ?? null,
    /** Base swap fee in percent (0.04 = 0.04%). */
    feePct: d.pool_config?.base_fee_pct ?? null,
    createdAt: d.created_at ?? null,
  };
}

export async function fetchPoolYield(address: string, signal?: AbortSignal) {
  // Concentrated-liquidity pools publish the same address/tvl/fees shape on their own data API.
  const host = CHAIN_POOLS.some((p) => p.pool === address && p.kind === "dlmm") ? "dlmm.datapi.meteora.ag" : "damm-v2.datapi.meteora.ag";
  const response = await fetch(`https://${host}/pools/${encodeURIComponent(address)}`, { signal: signal ?? null });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudo consultar el rendimiento de Meteora.");
  return parsePoolYield(await response.json(), address);
}

export const poolYieldOptions = (address: string) => ({
  queryKey: ["meteora-pool-yield", address],
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchPoolYield(address, signal),
  staleTime: 60_000,
  refetchInterval: 60_000,
  retry: 1,
});
