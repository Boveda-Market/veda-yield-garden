import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPoolStats, parsePoolStats } from "@/lib/pool-stats";

const pool = { address: "pool-a", token_x: { symbol: "SOL", decimals: 9 }, token_y: { symbol: "USDC", decimals: 6 }, current_price: 150.25, volume: { "24h": 12345 }, tvl: 50000, token_x_amount: 100, token_y_amount: 35000 };

afterEach(() => vi.unstubAllGlobals());

describe("Pool statistics", () => {
  it("keeps price, 24h volume and pool liquidity distinct", () => {
    expect(parsePoolStats(pool, "pool-a")).toMatchObject({ price: 150.25, volume24h: 12345, liquidityUsd: 50000, baseLocked: 100, quoteLocked: 35000 });
  });
  it("never substitutes statistics from another pool", () => {
    expect(parsePoolStats(pool, "pool-b")).toBeNull();
  });
  it("does not invent statistics for unindexed pools", () => {
    expect(parsePoolStats(null, "pool-a")).toBeNull();
  });
  it("preserves zero volume and leaves absent liquidity unavailable", () => {
    expect(parsePoolStats({ ...pool, tvl: undefined, volume: { "24h": 0 } }, "pool-a")).toMatchObject({ volume24h: 0, liquidityUsd: null });
  });
  it("leaves statistics not supplied by Meteora unavailable", () => {
    expect(parsePoolStats(pool, "pool-a")).toMatchObject({ change24h: null, transactions24h: null });
  });
  it("requests statistics exclusively from the official Meteora API", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => pool });
    vi.stubGlobal("fetch", fetch);
    await expect(fetchPoolStats("pool-a")).resolves.toMatchObject({ price: 150.25 });
    expect(fetch).toHaveBeenCalledExactlyOnceWith("https://damm-v2.datapi.meteora.ag/pools/pool-a", { signal: null });
  });
});