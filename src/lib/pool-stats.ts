import { z } from "zod";
import { CHAIN_POOLS } from "./solana-data";

const poolSchema = z.object({
  chainId: z.string(),
  pairAddress: z.string(),
  baseToken: z.object({ symbol: z.string(), address: z.string().nullish() }),
  quoteToken: z.object({ symbol: z.string() }),
  priceUsd: z.string().nullish(),
  volume: z.object({ h24: z.number().nonnegative().nullish(), h1: z.number().nonnegative().nullish().catch(null) }).nullish(),
  liquidity: z.object({ usd: z.number().nonnegative().nullish(), base: z.number().nonnegative().nullish(), quote: z.number().nonnegative().nullish() }).nullish(),
  priceChange: z.object({ m5: z.number().nullish().catch(null), h1: z.number().nullish(), h6: z.number().nullish(), h24: z.number().nullish() }).nullish(),
  marketCap: z.number().nonnegative().nullish(),
  txns: z.object({
    h24: z.object({ buys: z.number().nonnegative(), sells: z.number().nonnegative() }).nullish(),
    h1: z.object({ buys: z.number().nonnegative(), sells: z.number().nonnegative() }).nullish().catch(null),
  }).nullish(),
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
      baseAddress: p.baseToken.address ?? null,
      quoteSymbol: p.quoteToken.symbol,
      price: Number.isFinite(price) && price > 0 ? price : null,
      volume24h: p.volume?.h24 ?? null,
      liquidityUsd: p.liquidity?.usd ?? null,
      baseLocked: p.liquidity?.base ?? null,
      quoteLocked: p.liquidity?.quote ?? null,
      change24h: p.priceChange?.h24 ?? null,
      change1h: p.priceChange?.h1 ?? null,
      change6h: p.priceChange?.h6 ?? null,
      change5m: p.priceChange?.m5 ?? null,
      volume1h: p.volume?.h1 ?? null,
      buys1h: p.txns?.h1?.buys ?? null,
      sells1h: p.txns?.h1?.sells ?? null,
      marketCap: p.marketCap ?? null,
      buys24h: p.txns?.h24?.buys ?? null,
      sells24h: p.txns?.h24?.sells ?? null,
      transactions24h: p.txns?.h24 ? p.txns.h24.buys + p.txns.h24.sells : null,
    };
  }
  return null;
}

/** Short coin name for the screen (see coin-label.ts). */
export { coinLabel } from "./coin-label";

export async function fetchPoolStats(address: string, signal?: AbortSignal) {
  const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${encodeURIComponent(address)}`, { signal: signal ?? null });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudieron consultar las estadísticas del pool.");
  return parsePoolStats(await response.json(), address);
}
/**
 * Today's price of a vault's token, only when the market data is for that exact coin: matched by token address
 * (so new vaults work whatever their name or letter case), falling back to a case-insensitive name only when
 * the source omits the address. Unknown vaults get no price.
 */
export function vaultTokenPrice(stats: { baseSymbol: string; baseAddress?: string | null; price: number | null } | null | undefined, vaultId: string) {
  const cfg = CHAIN_POOLS.find((c) => c.id === vaultId);
  if (!stats || !cfg) return null;
  const same = stats.baseAddress ? stats.baseAddress === cfg.mint : stats.baseSymbol.toUpperCase().includes(cfg.symbol.toUpperCase());
  return same ? stats.price : null;
}

const marketSchema = z.object({
  chainId: z.string(),
  pairAddress: z.string(),
  baseToken: z.object({ address: z.string() }),
  quoteToken: z.object({ address: z.string() }),
  liquidity: z.object({ usd: z.number().finite().nonnegative().nullish() }).nullish(),
});

/**
 * Total dollar liquidity of every listed market that trades this exact coin (by token address), each market counted once.
 * The source lists only a coin's main markets, so `markets` says how many were added up.
 */
export function parseTokenLiquidity(data: unknown, mint: string) {
  if (!Array.isArray(data)) return null;
  const seen = new Set<string>();
  let totalUsd = 0;
  for (const candidate of data) {
    const parsed = marketSchema.safeParse(candidate);
    if (!parsed.success) continue;
    const p = parsed.data;
    if (p.chainId !== "solana" || seen.has(p.pairAddress)) continue;
    if (p.baseToken.address !== mint && p.quoteToken.address !== mint) continue;
    const usd = p.liquidity?.usd;
    if (usd == null) continue;
    seen.add(p.pairAddress);
    totalUsd += usd;
  }
  return seen.size ? { totalUsd, markets: seen.size } : null;
}

export async function fetchTokenLiquidity(mint: string, signal?: AbortSignal) {
  const response = await fetch(`https://api.dexscreener.com/token-pairs/v1/solana/${encodeURIComponent(mint)}`, { signal: signal ?? null });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("No se pudo consultar la liquidez de la moneda.");
  return parseTokenLiquidity(await response.json(), mint);
}

export const tokenLiquidityOptions = (mint: string) => ({
  queryKey: ["dexscreener-token-liquidity", mint],
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchTokenLiquidity(mint, signal),
  staleTime: 60_000,
  retry: 1,
});
