import { z } from "zod";

const pairSchema = z.object({
  chainId: z.string(),
  pairAddress: z.string(),
  dexId: z.string(),
  baseToken: z.object({ symbol: z.string() }),
  quoteToken: z.object({ symbol: z.string() }),
  priceUsd: z.string().optional(),
  volume: z.object({ h24: z.number().nonnegative().optional() }).optional(),
  liquidity: z.object({ usd: z.number().nonnegative().optional(), base: z.number().nonnegative().optional(), quote: z.number().nonnegative().optional() }).optional(),
  priceChange: z.object({ h24: z.number().optional() }).optional(),
  txns: z.object({ h24: z.object({ buys: z.number().nonnegative(), sells: z.number().nonnegative() }).optional() }).optional(),
});

export function parsePoolStats(data: unknown, address: string) {
  const response = z.object({ pairs: z.array(z.unknown()).nullable() }).parse(data);
  for (const candidate of response.pairs ?? []) {
    const parsed = pairSchema.safeParse(candidate);
    if (!parsed.success || parsed.data.chainId !== "solana" || parsed.data.pairAddress !== address) continue;
    const p = parsed.data;
    const price = p.priceUsd === undefined ? NaN : Number(p.priceUsd);
    return {
      baseSymbol: p.baseToken.symbol,
      quoteSymbol: p.quoteToken.symbol,
      dex: p.dexId,
      price: Number.isFinite(price) && price > 0 ? price : null,
      volume24h: p.volume?.h24 ?? null,
      liquidityUsd: p.liquidity?.usd ?? null,
      baseLocked: p.liquidity?.base ?? null,
      quoteLocked: p.liquidity?.quote ?? null,
      change24h: p.priceChange?.h24 ?? null,
      transactions24h: p.txns?.h24 ? p.txns.h24.buys + p.txns.h24.sells : null,
    };
  }
  return null;
}

export async function fetchPoolStats(address: string, signal?: AbortSignal) {
  const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${encodeURIComponent(address)}`, { signal: signal ?? null });
  if (!response.ok) throw new Error("No se pudieron consultar las estadísticas del pool.");
  return parsePoolStats(await response.json(), address);
}