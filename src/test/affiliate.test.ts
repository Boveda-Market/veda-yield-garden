import { describe, expect, it } from "vitest";
import { affiliateCommission, normalizeCode, tierShareBps } from "@/lib/affiliate";

describe("affiliate commissions", () => {
  it("base users earn 25% of the fee", () => expect(affiliateCommission(10_000_000n, tierShareBps("base"))).toBe(2_500_000n));
  it("affiliates earn 30% of the fee", () => expect(affiliateCommission(10_000_000n, tierShareBps("promoter"))).toBe(3_000_000n));
  it("approved VIP earn 60% of the fee", () => expect(affiliateCommission(10_000_000n, tierShareBps("vip"))).toBe(6_000_000n));
  it("floors fractional micro-USDC", () => expect(affiliateCommission(9_630n, 2500)).toBe(2_407n));
  it("unknown tiers fall back to 25%", () => expect(tierShareBps("x")).toBe(2500));
  it("normalizes codes", () => { expect(normalizeCode(" ab12cd ")).toBe("AB12CD"); expect(normalizeCode("a!")).toBeNull(); });
});
