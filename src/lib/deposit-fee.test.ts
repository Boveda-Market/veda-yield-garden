import { describe, expect, it } from "vitest";
import { depositFee } from "./fees";
import { AFFILIATE_SHARE_BPS, affiliateCommission } from "./affiliate";

const usdc = (n: number) => BigInt(Math.round(n * 1e6));

describe("deposit fee", () => {
  it("charges a flat 1% with no free allowance", () => {
    expect(depositFee(usdc(5))).toBe(usdc(0.05));
    expect(depositFee(usdc(100))).toBe(usdc(1));
  });
  it("affiliate earns 50% of the deposit fee", () => expect(affiliateCommission(depositFee(usdc(1000)), AFFILIATE_SHARE_BPS)).toBe(usdc(5)));
});
