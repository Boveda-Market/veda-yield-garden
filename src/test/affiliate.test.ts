import { describe, expect, it } from "vitest";
import { AFFILIATE_SHARE_BPS, affiliateCommission, customizeCodeRequest, normalizeCode } from "@/lib/affiliate";

describe("affiliate commissions", () => {
  it("all affiliates earn 60% of the collected fee", () => { expect(AFFILIATE_SHARE_BPS).toBe(6000); expect(affiliateCommission(10_000_000n, AFFILIATE_SHARE_BPS)).toBe(6_000_000n); });
  it("floors fractional micro-USDC", () => expect(affiliateCommission(9_631n, AFFILIATE_SHARE_BPS)).toBe(5_778n));
  it("no collected fee earns no commission", () => expect(affiliateCommission(0n, AFFILIATE_SHARE_BPS)).toBe(0n));
  it("custom codes normalize and reject account or rate overrides", () => {
    const token = "x".repeat(20);
    expect(customizeCodeRequest.parse({ token, code: " angel60 " }).code).toBe("ANGEL60");
    expect(customizeCodeRequest.safeParse({ token, code: "ANGEL60", privy_user_id: "other" }).success).toBe(false);
    expect(customizeCodeRequest.safeParse({ token, code: "ANGEL60", shareBps: 10000 }).success).toBe(false);
  });
  it("custom codes require 4–16 alphanumeric characters", () => { for (const code of ["abc", "a".repeat(17), "angel soto", "angel!"]) expect(normalizeCode(code)).toBeNull(); expect(normalizeCode("a".repeat(16))).toBe("A".repeat(16)); });
  it("normalizes codes", () => { expect(normalizeCode(" ab12cd ")).toBe("AB12CD"); expect(normalizeCode("a!")).toBeNull(); });
});
