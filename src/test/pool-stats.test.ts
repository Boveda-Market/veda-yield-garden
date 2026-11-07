import { describe, expect, it } from "vitest";
import { parsePoolStats } from "@/lib/pool-stats";

const pair = { chainId: "solana", pairAddress: "pool-a", dexId: "meteora", baseToken: { symbol: "SOL" }, quoteToken: { symbol: "USDC" }, priceUsd: "150.25", volume: { h24: 12345 }, liquidity: { usd: 50000, base: 100, quote: 35000 }, txns: { h24: { buys: 10, sells: 20 } } };

describe("Pool statistics", () => {
  it("keeps price, 24h volume and pool liquidity distinct", () => {
    expect(parsePoolStats({ pairs: [pair] }, "pool-a")).toMatchObject({ price: 150.25, volume24h: 12345, liquidityUsd: 50000, baseLocked: 100, quoteLocked: 35000, transactions24h: 30 });
  });
  it("never substitutes statistics from another pool", () => {
    expect(parsePoolStats({ pairs: [pair] }, "pool-b")).toBeNull();
  });
  it("does not invent statistics for unindexed pools", () => {
    expect(parsePoolStats({ pairs: null }, "pool-a")).toBeNull();
  });
  it("preserves zero volume and leaves absent liquidity unavailable", () => {
    expect(parsePoolStats({ pairs: [{ ...pair, liquidity: undefined, volume: { h24: 0 } }] }, "pool-a")).toMatchObject({ volume24h: 0, liquidityUsd: null });
  });
});