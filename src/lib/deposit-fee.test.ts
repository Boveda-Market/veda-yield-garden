import { describe, expect, it } from "vitest";
import { depositFee } from "./fees";
import { AFFILIATE_SHARE_BPS, affiliateCommission } from "./affiliate";

const usdc = (n: number) => BigInt(Math.round(n * 1e6));

describe("deposit fee", () => {
  it("vault deposits are free in every tier", () => {
    for (const n of [5, 100, 1000, 5000]) expect(depositFee(usdc(n))).toBe(0n);
  });
  it("free deposits credit no affiliate commission", () => expect(affiliateCommission(depositFee(usdc(1000)), AFFILIATE_SHARE_BPS)).toBe(0n));
});
