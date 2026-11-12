import { describe, expect, it } from "vitest";
import { depositFee } from "./fees";
import { AFFILIATE_SHARE_BPS, affiliateCommission } from "./affiliate";

const usdc = (n: number) => BigInt(Math.round(n * 1e6));

describe("deposit fee", () => {
  it("charges 2% under $100 and 1.25% from $100", () => {
    expect(depositFee(usdc(5))).toBe(usdc(0.1));
    expect(depositFee(usdc(100))).toBe(usdc(1.25));
  });
  it("affiliate earns 50% of the deposit fee", () => expect(affiliateCommission(depositFee(usdc(1000)), AFFILIATE_SHARE_BPS)).toBe(usdc(3.75)));
});
