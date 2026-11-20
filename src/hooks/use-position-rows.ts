import { useQueries } from "@tanstack/react-query";
import { fetchPoolStats } from "@/lib/pool-stats";
import { poolYieldOptions } from "@/lib/pool-yield";
import { estimateUsd, change24hUsd } from "@/lib/position-value";
import { isOperableVault, type ChainPosition } from "@/lib/solana-data";
import { VAULTS } from "@/lib/vaults";
import { canHarvest } from "@/lib/harvest";

export const operable = (p: ChainPosition) => isOperableVault(p.vaultId);

/** Estimated USD value, pending fees and APR per position (shared cache with pool details). */
export function usePositionRows(positions: ChainPosition[]) {
  const pools = positions.map((p) => VAULTS.find((v) => v.id === p.vaultId)?.pool ?? null);
  const stats = useQueries({ queries: pools.map((pool) => ({ queryKey: ["dexscreener-pool-stats", pool], queryFn: ({ signal }: { signal: AbortSignal }) => fetchPoolStats(pool as string, signal), enabled: Boolean(pool), staleTime: 60_000, retry: 1,
    // A missing price retries on its own every 10 s, so the total fills in without the person reloading.
    refetchInterval: (q: { state: { data?: unknown } }) => (q.state.data ? 60_000 : 10_000) })) });
  const yields = useQueries({ queries: pools.map((pool) => ({ ...poolYieldOptions(pool ?? ""), enabled: Boolean(pool) })) });
  const rows = positions.map((p, i) => {
    const s = stats[i]?.data;
    const price = s && s.baseSymbol.toUpperCase().includes(p.symbol.toUpperCase()) ? s.price : null;
    return { p, value: estimateUsd(p.tokenAmount, p.usdcAmount, price), fees: estimateUsd(p.feeTokenAmount, p.feeUsdcAmount, price), apr: yields[i]?.data?.apr ?? null, price, pool: pools[i] ?? null, change24h: change24hUsd(p.tokenAmount, price, s?.change24h ?? null) };
  });
  const loading = stats.some((s) => s?.isLoading);
  const ready = rows.filter((r) => r.fees !== null && r.fees > 0 && operable(r.p));
  const totalFees = ready.reduce((sum, r) => sum + (r.fees ?? 0), 0);
  const top = [...ready].filter((r) => canHarvest(r.fees)).sort((a, b) => (b.fees ?? 0) - (a.fees ?? 0))[0] ?? null;
  const capital = rows.every((r) => r.value !== null) ? rows.reduce((sum, r) => sum + (r.value ?? 0), 0) : null;
  // Once price lookups have settled, the sum of positions that do have a price, so totals never wait forever on one missing price.
  const knownCapital = rows.reduce((sum, r) => sum + (r.value ?? 0), 0);
  const change24h = rows.every((r) => r.change24h !== null) ? rows.reduce((sum, r) => sum + (r.change24h ?? 0), 0) : null;
  return { change24h, rows, ready, totalFees, top, capital, knownCapital, loading };
}
