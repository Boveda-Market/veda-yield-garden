import { z } from "zod";

const poolSchema = z.object({
  address: z.string(),
  token_x: z.object({ symbol: z.string() }),
  token_y: z.object({ symbol: z.string() }),
  current_price: z.number().positive().nullish(),
  volume: z.object({ "24h": z.number().nonnegative().nullish() }).nullish(),
  tvl: z.number().nonnegative().nullish(),
  token_x_amount: z.number().nonnegative().nullish(),
  token_y_amount: z.number().nonnegative().nullish(),
});

export function parsePoolStats(data: unknown, address: string) {
  const parsed = poolSchema.safeParse(data);
  if (!parsed.success || parsed.data.address !== address) return null;
  const p = parsed.data;
  return {
    baseSymbol: p.token_x.symbol,
    quoteSymbol: p.token_y.symbol,
    price: p.current_price ?? null,
    volume24h: p.volume?.["24h"] ?? null,
    liquidityUsd: p.tvl ?? null,
    baseLocked: p.token_x_amount ?? null,
    quoteLocked: p.token_y_amount ?? null,
    // These metrics are not returned by the official single-pool endpoint.
    change24h: null,
    transactions24h: null,
  };
}

export async function fetchPoolStats(address: string, signal?: AbortSignal) {
  const response = await fetch(`https://damm-v2.datapi.meteora.ag/pools/${encodeURIComponent(address)}`, { signal: signal ?? null });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudieron consultar las estadísticas del pool.");
  return parsePoolStats(await response.json(), address);
}