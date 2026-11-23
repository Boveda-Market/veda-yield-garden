import { describe, expect, it } from "vitest";
import { parseBitcoinStats } from "./bitcoin-stats";

describe("parseBitcoinStats", () => {
  it("reads holders, market cap and converts satoshis to bitcoins", () => {
    expect(parseBitcoinStats({ data: { hodling_addresses: 59862684, circulation: 2011648041655096, market_cap_usd: 1230807510551 } }))
      .toEqual({ holders: 59862684, circulating: 20116480.41655096, marketCap: 1230807510551 });
  });
  it("drops an impossible supply above 21 million bitcoins", () => {
    expect(parseBitcoinStats({ data: { hodling_addresses: 10, circulation: 22_000_000e8 } })?.circulating).toBeNull();
  });
  it("is unavailable when the source has nothing usable", () => {
    expect(parseBitcoinStats({ data: {} })).toBeNull();
    expect(parseBitcoinStats({})).toBeNull();
  });
});
