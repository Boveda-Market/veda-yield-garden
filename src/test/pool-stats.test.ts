import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPoolStats, parsePoolStats } from "@/lib/pool-stats";

const pool = { chainId: "solana", pairAddress: "pool-a", baseToken: { symbol: "SOL" }, quoteToken: { symbol: "USDC" }, priceUsd: "150.25", volume: { h24: 12345 }, liquidity: { usd: 50000, base: 100, quote: 35000 }, priceChange: { h24: -2.5 }, txns: { h24: { buys: 10, sells: 20 } } };

afterEach(() => vi.unstubAllGlobals());

describe("Pool statistics", () => {
  it("keeps price, 24h volume and pool liquidity distinct", () => {
    expect(parsePoolStats({ pairs: [pool] }, "pool-a")).toMatchObject({ price: 150.25, volume24h: 12345, liquidityUsd: 50000, baseLocked: 100, quoteLocked: 35000 });
  });
  it("never substitutes statistics from another pool", () => {
    expect(parsePoolStats({ pairs: [pool] }, "pool-b")).toBeNull();
  });
  it("does not invent statistics for unindexed pools", () => {
    expect(parsePoolStats({ pairs: null }, "pool-a")).toBeNull();
  });
  it("preserves zero volume and leaves absent liquidity unavailable", () => {
    expect(parsePoolStats({ pairs: [{ ...pool, liquidity: undefined, volume: { h24: 0 } }] }, "pool-a")).toMatchObject({ volume24h: 0, liquidityUsd: null });
  });
  it("returns the 24-hour price change and operation count from DexScreener", () => {
    expect(parsePoolStats({ pairs: [pool] }, "pool-a")).toMatchObject({ change24h: -2.5, transactions24h: 30 });
  });
  it("leaves absent price changes unavailable rather than inventing zero", () => {
    expect(parsePoolStats({ pairs: [{ ...pool, priceChange: undefined }] }, "pool-a")).toMatchObject({ change24h: null });
  });
  it("requests statistics exclusively from DexScreener", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ pairs: [pool] }) });
    vi.stubGlobal("fetch", fetch);
    await expect(fetchPoolStats("pool-a")).resolves.toMatchObject({ price: 150.25 });
    expect(fetch).toHaveBeenCalledExactlyOnceWith("https://api.dexscreener.com/latest/dex/pairs/solana/pool-a", { signal: null });
  });
});
describe("Last-hour pool activity", () => {
  it("reads 5-minute price change and last-hour volume and trades of the exact pool", () => {
    const p = { ...pool, priceChange: { m5: 0.04, h1: -0.08, h24: 0.6 }, volume: { h24: 12345, h1: 257 }, txns: { h24: { buys: 10, sells: 20 }, h1: { buys: 143, sells: 186 } } };
    expect(parsePoolStats({ pairs: [p] }, "pool-a")).toMatchObject({ change5m: 0.04, volume1h: 257, buys1h: 143, sells1h: 186 });
  });
  it("keeps last-hour figures unavailable when the source omits them", () => {
    expect(parsePoolStats({ pairs: [pool] }, "pool-a")).toMatchObject({ change5m: null, volume1h: null, buys1h: null });
  });
});
