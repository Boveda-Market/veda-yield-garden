import { describe, expect, it } from "vitest";
import { amountAllowed, isBtcAddress, providerCost, BOVEDA_BTC_FEE_PCT } from "./btc-offramp";

describe("btc offramp", () => {
  it("minimum withdrawal is 25 USDC", () => { expect(amountAllowed(24.99)).toBe(false); expect(amountAllowed(25)).toBe(true); });
  it("BÓVEDA charges 0% on Bitcoin withdrawals", () => expect(BOVEDA_BTC_FEE_PCT).toBe(0));
  it("accepts Bitcoin addresses and rejects Solana ones", () => {
    expect(isBtcAddress("bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq")).toBe(true);
    expect(isBtcAddress("1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2")).toBe(true);
    expect(isBtcAddress("7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU")).toBe(false);
  });
  it("provider cost is sent minus value received", () => {
    const c = providerCost(100, 0.001, 98000);
    expect(c.cost).toBeCloseTo(2); expect(c.pct).toBeCloseTo(2);
  });
});
