import { describe, expect, it } from "vitest";
import { BTC_OFFRAMP_MIN_NET_USDC, netAmountAllowed } from "@/lib/btc-offramp";

describe("Cash App minimum", () => {
  it("accepts exactly $25 after Bóveda's 2% fee ($24.50 net)", () => {
    expect(BTC_OFFRAMP_MIN_NET_USDC).toBe(24.5);
    expect(netAmountAllowed(24.5)).toBe(true);
  });
  it("still rejects amounts under the minimum", () => {
    expect(netAmountAllowed(24.49)).toBe(false);
  });
});
