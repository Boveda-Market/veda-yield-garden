import { useQuery } from "@tanstack/react-query";
import { readTokenBalance, STABLE_SYMBOLS, SWAP_TOKENS } from "@/lib/wallet-actions";
import { walletExtrasUsd } from "@/lib/wallet-holdings";

const SOL_MINT = "So11111111111111111111111111111111111111112";
/** Held coins besides USDC (counted as cash) and SOL (the network reserve). */
export const EXTRA_TOKENS = SWAP_TOKENS.filter((x) => x.symbol !== "SOL" && x.symbol !== "USDC");

/** Shared market prices for wallet coins plus SOL (stable dollars fixed at 1). */
export function useWalletPrices() {
  return useQuery({ queryKey: ["wallet-prices"], staleTime: 60_000, queryFn: async () => {
    const out: Record<string, number> = Object.fromEntries(STABLE_SYMBOLS.map((s) => [s, 1]));
    const targets = [...SWAP_TOKENS.filter((x) => !STABLE_SYMBOLS.includes(x.symbol)), { symbol: "SOL", mint: SOL_MINT }];
    await Promise.all(targets.map(async (x) => {
      try {
        const r = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${x.mint}`);
        const j = await r.json() as { priceUsd?: string; liquidity?: { usd?: number } }[];
        const best = Array.isArray(j) ? [...j].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0] : undefined;
        const p = Number(best?.priceUsd); if (Number.isFinite(p) && p > 0) out[x.symbol] = p;
      } catch { /* price unavailable */ }
    }));
    return out;
  } });
}

export function useWalletTokens(address: string | null | undefined) {
  return useQuery({ queryKey: ["my-wallet-tokens", address], enabled: !!address && EXTRA_TOKENS.length > 0, queryFn: async () =>
    Object.fromEntries(await Promise.all(EXTRA_TOKENS.map(async (x) => [x.symbol, await readTokenBalance(address!, x.mint).catch(() => undefined)] as const))) as Record<string, bigint | undefined> });
}

/** Dollar value of the network reserve and every other held coin (same cache as Billetera). */
export function useWalletExtrasUsd(address: string | null | undefined, solLamports: bigint | undefined) {
  const prices = useWalletPrices();
  const tokens = useWalletTokens(address);
  return walletExtrasUsd(solLamports, EXTRA_TOKENS.map((x) => ({ symbol: x.symbol, decimals: x.decimals, raw: tokens.data?.[x.symbol] })), prices.data ?? {});
}
