import { describe, expect, it } from "vitest";
import { AFFILIATE_SHARE_BPS, affiliateCommission, payoutProgress } from "./affiliate";
import { progressiveFee } from "./fees";

const usdc = (n: number) => BigInt(Math.round(n * 1e6));
const earn = (gross: number) => affiliateCommission(progressiveFee(usdc(gross)), AFFILIATE_SHARE_BPS);

describe("affiliate economics", () => {
  it("pays nothing on operations up to 10 USDC", () => expect(earn(10)).toBe(0n));
  it("pays 50% of the 1.25% excess fee", () => {
    expect(earn(50)).toBe(usdc(0.25));
    expect(earn(200)).toBe(usdc(1.1875));
    expect(earn(1000)).toBe(usdc(6.1875));
  });
  it("payout requires 10 USDC accumulated", () => {
    expect(payoutProgress(usdc(4.5))).toEqual({ pct: 45, ready: false, missingRaw: usdc(5.5) });
    expect(payoutProgress(usdc(10)).ready).toBe(true);
  });
});
