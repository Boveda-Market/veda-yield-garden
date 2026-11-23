import { describe, expect, it } from "vitest";
import { parsePoolYield } from "@/lib/pool-yield";

describe("Real pool yield", () => {
  const pool = { address: "pool-a", tvl: 100_000, fees: { "24h": 10 } };
  it("annualizes actual 24-hour fees without assuming compounding", () => {
    expect(parsePoolYield(pool, "pool-a")?.apr).toBeCloseTo(3.65, 8);
  });
  it("never uses another pool's yield", () => {
    expect(parsePoolYield(pool, "pool-b")).toBeNull();
  });
  it("keeps absent fees unavailable instead of substituting an illustrative APY", () => {
    expect(parsePoolYield({ address: "pool-a", tvl: 100_000 }, "pool-a")?.apr).toBeNull();
  });
  it("keeps zero fees as a real zero rate", () => {
    expect(parsePoolYield({ ...pool, fees: { "24h": 0 } }, "pool-a")?.apr).toBe(0);
  });
  it("does not calculate a rate with empty TVL", () => {
    expect(parsePoolYield({ ...pool, tvl: 0 }, "pool-a")?.apr).toBeNull();
  });
});
describe("Public pool metrics", () => {
  const full = {
    address: "pool-a", tvl: 1_000_000, fees: { "1h": 48, "24h": 1850 }, volume: { "1h": 126_000, "24h": 4_053_869 },
    cumulative_metrics: { volume: 2_795_047_717, fees: 1_148_346 }, token_x: { holders: 79075, symbol: "cbBTC" }, token_y: { symbol: "USDC" },
    token_x_amount: 14.54, token_y_amount: 216_802.8, pool_config: { base_fee_pct: 0.04 }, created_at: 1731019054000,
  };
  it("reads lifetime fees and volume of the exact pool", () => {
    const m = parsePoolYield(full, "pool-a");
    expect(m?.totalFees).toBe(1_148_346);
    expect(m?.totalVolume).toBe(2_795_047_717);
    expect(m?.feePct).toBe(0.04);
  });
  it("keeps token amounts separate from dollar figures", () => {
    const m = parsePoolYield(full, "pool-a");
    expect(m?.amountX).toBe(14.54);
    expect(m?.tvl).toBe(1_000_000);
  });
  it("a malformed optional metric is unavailable but never hides the verified rate", () => {
    const m = parsePoolYield({ ...full, cumulative_metrics: { fees: "lots" }, pool_config: { base_fee_pct: -1 } }, "pool-a");
    expect(m?.totalFees).toBeNull();
    expect(m?.feePct).toBeNull();
    expect(m?.apr).toBeCloseTo(67.525, 3);
  });
});

describe("Coin facts for the pool statistics tab", () => {
  const base = { address: "pool-a", tvl: 1, fees: { "24h": 0 } };
  it("reads the coin's verification, supply and market cap from the exact pool", () => {
    const m = parsePoolYield({ ...base, token_x: { holders: 5, is_verified: false, total_supply: 987_159_629, market_cap: 1_105_697 } }, "pool-a");
    expect(m).toMatchObject({ tokenVerified: false, tokenSupply: 987_159_629, tokenMarketCap: 1_105_697 });
  });
  it("reports a coin as freezable only when the issuer's freeze power is still on", () => {
    expect(parsePoolYield({ ...base, token_x: { freeze_authority_disabled: false } }, "pool-a")?.tokenFreezable).toBe(true);
    expect(parsePoolYield({ ...base, token_x: { freeze_authority_disabled: true } }, "pool-a")?.tokenFreezable).toBe(false);
    expect(parsePoolYield(base, "pool-a")?.tokenFreezable).toBeNull();
  });
  it("gives deposits what the platform does not keep of each fee: 5% platform share leaves 95%", () => {
    expect(parsePoolYield({ ...base, pool_config: { protocol_fee_pct: 5 } }, "pool-a")?.depositorFeeShare).toBe(95);
    expect(parsePoolYield({ ...base, pool_config: { protocol_fee_pct: 20 } }, "pool-a")?.depositorFeeShare).toBe(80);
    expect(parsePoolYield(base, "pool-a")?.depositorFeeShare).toBeNull();
  });
});
