import { z } from "zod";

const poolSchema = z.object({
  chainId: z.string(),
  pairAddress: z.string(),
  baseToken: z.object({ symbol: z.string() }),
  quoteToken: z.object({ symbol: z.string() }),
  priceUsd: z.string().nullish(),
  volume: z.object({ h24: z.number().nonnegative().nullish() }).nullish(),
  liquidity: z.object({ usd: z.number().nonnegative().nullish(), base: z.number().nonnegative().nullish(), quote: z.number().nonnegative().nullish() }).nullish(),
  priceChange: z.object({ h1: z.number().nullish(), h6: z.number().nullish(), h24: z.number().nullish() }).nullish(),
  marketCap: z.number().nonnegative().nullish(),
  txns: z.object({ h24: z.object({ buys: z.number().nonnegative(), sells: z.number().nonnegative() }).nullish() }).nullish(),
});

export function parsePoolStats(data: unknown, address: string) {
  const response = z.object({ pairs: z.array(z.unknown()).nullish() }).safeParse(data);
  if (!response.success) return null;
  for (const candidate of response.data.pairs ?? []) {
    const parsed = poolSchema.safeParse(candidate);
    if (!parsed.success || parsed.data.chainId !== "solana" || parsed.data.pairAddress !== address) continue;
    const p = parsed.data;
    const price = p.priceUsd == null ? NaN : Number(p.priceUsd);
    return {
      baseSymbol: p.baseToken.symbol,
      quoteSymbol: p.quoteToken.symbol,
      price: Number.isFinite(price) && price > 0 ? price : null,
      volume24h: p.volume?.h24 ?? null,
      liquidityUsd: p.liquidity?.usd ?? null,
      baseLocked: p.liquidity?.base ?? null,
      quoteLocked: p.liquidity?.quote ?? null,
      change24h: p.priceChange?.h24 ?? null,
      change1h: p.priceChange?.h1 ?? null,
      change6h: p.priceChange?.h6 ?? null,
      marketCap: p.marketCap ?? null,
      buys24h: p.txns?.h24?.buys ?? null,
      sells24h: p.txns?.h24?.sells ?? null,
      transactions24h: p.txns?.h24 ? p.txns.h24.buys + p.txns.h24.sells : null,
    };
  }
  return null;
}

export async function fetchPoolStats(address: string, signal?: AbortSignal) {
  const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${encodeURIComponent(address)}`, { signal: signal ?? null });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudieron consultar las estadísticas del pool.");
  return parsePoolStats(await response.json(), address);
}