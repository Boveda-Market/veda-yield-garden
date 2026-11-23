import { describe, expect, it } from "vitest";
import { dailyVolatility, parsePoolFlow, poolDataHost, tvlSharePct, turnoverPct } from "./pool-metrics";

describe("dailyVolatility", () => {
  it("is the spread of day-to-day changes", () => {
    // +10%, -10%, +10% -> mean 3.3333, variance 88.8889, stdev 9.4281
    expect(dailyVolatility([100, 110, 99, 108.9]).volPct?.toFixed(4)).toBe("9.4281");
    expect(dailyVolatility([100, 110, 99, 108.9]).days).toBe(3);
  });

  it("needs three changes before it reports a number", () => {
    expect(dailyVolatility([100, 110]).volPct).toBeNull();
    expect(dailyVolatility([100, 110]).days).toBe(1);
    expect(dailyVolatility([]).volPct).toBeNull();
  });

  it("skips missing or impossible closes instead of guessing", () => {
    const clean = dailyVolatility([100, 110, 99, 108.9]);
    const dirty = dailyVolatility([100, null, 110, 0, 99, NaN, 108.9]);
    expect(dirty.volPct?.toFixed(4)).toBe(clean.volPct?.toFixed(4));
    expect(dirty.days).toBe(3);
  });

  it("is zero when the price never moves", () => {
    expect(dailyVolatility([100, 100, 100, 100]).volPct).toBe(0);
  });
});

describe("tvlSharePct", () => {
  it("is the pool's share of all the money in the protocol", () => {
    expect(tvlSharePct(1_105_939.51, 159_468_175.33)?.toFixed(3)).toBe("0.694");
  });

  it("stays unavailable without both figures", () => {
    expect(tvlSharePct(1_105_939.51, null)).toBeNull();
    expect(tvlSharePct(null, 159_468_175.33)).toBeNull();
    expect(tvlSharePct(1_105_939.51, 0)).toBeNull();
  });
});

describe("turnoverPct", () => {
  it("is 24 h volume over the money in the pool", () => {
    expect(turnoverPct(4_024_327.62, 1_105_939.51)?.toFixed(1)).toBe("363.9");
  });

  it("stays unavailable without both figures", () => {
    expect(turnoverPct(null, 1_105_939.51)).toBeNull();
    expect(turnoverPct(4_024_327.62, 0)).toBeNull();
    expect(turnoverPct(-1, 100)).toBeNull();
  });
});

describe("poolDataHost", () => {
  it("reads each pool from its own protocol", () => {
    expect(poolDataHost("7ubS3GccjhQY99AYNKXjNJqnXjaokEdfdV915xnCb96r")).toBe("dlmm.datapi.meteora.ag");
    expect(poolDataHost("8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie")).toBe("damm-v2.datapi.meteora.ag");
  });
});

describe("parsePoolFlow", () => {
  const BTC = "7ubS3GccjhQY99AYNKXjNJqnXjaokEdfdV915xnCb96r";
  const row = { pool_address: BTC, net_deposits: 43078.46, total_deposits: 2387000.9, total_withdraws: 2343922.44 };

  it("keeps only the pool we asked for", () => {
    expect(parsePoolFlow({ data: [row] }, BTC)).toEqual({ netDeposits: 43078.46, totalDeposits: 2387000.9, totalWithdraws: 2343922.44 });
    expect(parsePoolFlow({ data: [row] }, "8Pm2kZpnxD3hoMmt4bjStX2Pw2Z9abpbHzZxMPqxPmie")).toBeNull();
  });

  it("counts the money itself when the source omits the net figure", () => {
    const noNet = { pool_address: BTC, total_deposits: 8348.75, total_withdraws: 8355.54 };
    expect(parsePoolFlow({ data: [noNet] }, BTC)?.netDeposits).toBeCloseTo(-6.79, 2);
  });

  it("stays unavailable instead of guessing", () => {
    expect(parsePoolFlow({ data: [] }, BTC)).toBeNull();
    expect(parsePoolFlow({}, BTC)).toBeNull();
    expect(parsePoolFlow({ data: [{ pool_address: BTC }] }, BTC)).toBeNull();
    expect(parsePoolFlow({ data: [{ pool_address: BTC, total_deposits: 5 }] }, BTC)).toBeNull();
    expect(parsePoolFlow({ data: [{ pool_address: BTC, total_deposits: "5", total_withdraws: 1 }] }, BTC)).toBeNull();
  });
});
