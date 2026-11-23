import { z } from "zod";

/**
 * Whole-network Bitcoin facts for the Bóveda Bitcoin coin section. The vault holds Coinbase's
 * cbBTC, whose own token stats (a few thousand wallets) would understate Bitcoin itself, so the
 * coin tiles read the public Bitcoin network stats instead; pool tiles keep the pool's own data.
 */
const statsResponse = z.object({
  data: z.object({
    hodling_addresses: z.number().int().positive().nullish().catch(null),
    circulation: z.number().positive().nullish().catch(null),
    market_cap_usd: z.number().finite().positive().nullish().catch(null),
  }).nullish().catch(null),
});

export type BitcoinStats = { holders: number | null; circulating: number | null; marketCap: number | null };

/** Circulation arrives in satoshis (100,000,000 per bitcoin); nothing is guessed when missing. */
export function parseBitcoinStats(json: unknown): BitcoinStats | null {
  const d = statsResponse.safeParse(json).data?.data;
  if (!d) return null;
  const circulating = d.circulation == null ? null : d.circulation / 1e8;
  const stats = {
    holders: d.hodling_addresses ?? null,
    circulating: circulating != null && circulating > 0 && circulating <= 21_000_000 ? circulating : null,
    marketCap: d.market_cap_usd ?? null,
  };
  return stats.holders == null && stats.circulating == null && stats.marketCap == null ? null : stats;
}

export async function fetchBitcoinStats(signal?: AbortSignal): Promise<BitcoinStats | null> {
  const response = await fetch("https://api.blockchair.com/bitcoin/stats", { signal: signal ?? null });
  if (!response.ok) throw new Error("No se pudieron consultar las estadísticas de Bitcoin.");
  return parseBitcoinStats(await response.json());
}

export const bitcoinStatsOptions = () => ({
  queryKey: ["bitcoin-network-stats"],
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchBitcoinStats(signal),
  staleTime: 10 * 60_000,
  retry: 1,
});
