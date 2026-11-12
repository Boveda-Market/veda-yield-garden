import { useInfiniteQuery, useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMeteoraHistory } from "@/lib/meteora-history.functions";
import { harvestedUsdValue, meteoraMetrics } from "@/lib/meteora-history";
import { fetchPoolStats } from "@/lib/pool-stats";

/** Shared, cached vault history + harvested PNL. Summary and history list reuse one query. */
export function useMeteoraHistory(wallet: string | null) {
  const read = useServerFn(getMeteoraHistory);
  const query = useInfiniteQuery({ queryKey: ["meteora-history", wallet], initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => { if (!wallet) throw new Error("wallet"); const result = await read({ data: { wallet, before: pageParam } }); if (!result.success) throw new Error(result.error); return result.page; },
    getNextPageParam: (last) => last.missing === 0 ? last.next ?? undefined : undefined,
    enabled: Boolean(wallet), staleTime: 60_000, retry: false, maxPages: 8 });
  const pages = query.data?.pages ?? [];
  const records = [...new Map(pages.flatMap((page) => page.records).map((row) => [row.id, row])).values()].sort((a, b) => b.slot - a.slot);
  const metrics = meteoraMetrics(records);
  const priced = metrics.totals.filter((p) => p.id !== "rwa");
  const priceQueries = useQueries({ queries: priced.map((p) => ({ queryKey: ["dexscreener-pool-stats", p.pool], queryFn: ({ signal }: { signal: AbortSignal }) => fetchPoolStats(p.pool, signal), staleTime: 60_000, retry: 1 })) });
  const prices = Object.fromEntries(priced.map((p, i) => { const s = priceQueries[i]?.data; return [p.id, s && s.baseSymbol.toUpperCase().includes(p.symbol) ? s.price : null]; }));
  const ready = pages.length > 0;
  const pnl = ready ? harvestedUsdValue(metrics.totals, prices) : null;
  const missing = pages.reduce((sum, page) => sum + page.missing, 0);
  const scanned = pages.reduce((sum, page) => sum + page.scanned, 0);
  return { query, pages, records, metrics, pnl, ready, missing, scanned };
}
