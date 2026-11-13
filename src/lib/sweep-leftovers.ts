import { CHAIN_POOLS } from "@/lib/solana-data";
import { JUPUSD_MINT } from "@/lib/wallet-actions";

/** Smallest leftover worth converting: 0.01 USDC (micro-USDC). Below this the network cost outweighs the value. */
export const SWEEP_MIN_MICRO = 10_000n;

/** Leftover tokens a liquidation converts to USDC: JupUSD plus validated vault tokens. Native SOL is the network reserve and is never swept. */
export function sweepTargets(): { symbol: string; mint: string }[] {
  return [
    { symbol: "JupUSD", mint: JUPUSD_MINT },
    ...CHAIN_POOLS.flatMap((p) => "swapDecimals" in p && p.symbol !== "SOL" ? [{ symbol: p.symbol, mint: p.mint }] : []),
  ];
}

export function worthSweeping(outMicro: bigint) { return outMicro >= SWEEP_MIN_MICRO; }

/**
 * Converts every leftover JupUSD / vault token in the wallet to USDC, one wallet-signed swap each,
 * with no BÓVEDA fee (swaps are free). Returns the USDC quoted and any symbols that could not be converted.
 */
export async function sweepLeftovers(wallet: string, signAndSend: (tx: Uint8Array) => Promise<string>, onStep?: (symbol: string, index: number, total: number) => void) {
  const { quoteSwap, buildSwap, readTokenBalance } = await import("@/lib/wallet-actions");
  const balances = await Promise.all(sweepTargets().map(async (t) => ({ ...t, amount: await readTokenBalance(wallet, t.mint).catch(() => 0n) })));
  const quoted: { symbol: string; quote: Awaited<ReturnType<typeof quoteSwap>> }[] = [];
  const failed: string[] = [];
  for (const b of balances) {
    if (b.amount <= 0n) continue;
    try { const q = await quoteSwap(b.symbol, "USDC", b.amount, { feeUsdc: 0n }); if (worthSweeping(BigInt(q.outAmount))) quoted.push({ symbol: b.symbol, quote: q }); }
    catch { /* too small or no route: leave it in the wallet */ }
  }
  let usdc = 0n;
  for (const [i, item] of quoted.entries()) {
    onStep?.(item.symbol, i + 1, quoted.length);
    try {
      // Re-quote right before signing so the guaranteed minimum is fresh.
      const fresh = await quoteSwap(item.symbol, "USDC", item.quote.amount, { feeUsdc: 0n });
      await signAndSend(await buildSwap(wallet, fresh));
      usdc += BigInt(fresh.outAmount);
    } catch { failed.push(item.symbol); }
  }
  return { usdc, converted: quoted.length - failed.length, failed };
}
