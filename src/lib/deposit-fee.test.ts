import { describe, expect, it } from "vitest";
import { depositFee } from "./fees";
import { AFFILIATE_SHARE_BPS, affiliateCommission } from "./affiliate";

const usdc = (n: number) => BigInt(Math.round(n * 1e6));

describe("deposit fee", () => {
  it("is free up to 5 USDC", () => expect(depositFee(usdc(5))).toBe(0n));
  it("charges 0.5% only above 5 USDC", () => {
    expect(depositFee(usdc(10))).toBe(usdc(0.025));
    expect(depositFee(usdc(100))).toBe(usdc(0.475));
    expect(depositFee(usdc(1000))).toBe(usdc(4.975));
  });
  it("affiliate earns 60% of the deposit fee", () => expect(affiliateCommission(depositFee(usdc(1000)), AFFILIATE_SHARE_BPS)).toBe(usdc(2.985)));
});
