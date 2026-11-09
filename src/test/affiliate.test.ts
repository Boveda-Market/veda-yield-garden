import { describe, expect, it } from "vitest";
import { AFFILIATE_SHARE_BPS, affiliateCommission, customizeCodeRequest, normalizeCode } from "@/lib/affiliate";

describe("affiliate commissions", () => {
  it("direct affiliates earn 50% of the collected fee", () => { expect(AFFILIATE_SHARE_BPS).toBe(5000); expect(affiliateCommission(10_000_000n, AFFILIATE_SHARE_BPS)).toBe(5_000_000n); });
  it("floors fractional micro-USDC", () => expect(affiliateCommission(9_631n, AFFILIATE_SHARE_BPS)).toBe(4_815n));
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

import { subAffiliateShare } from "@/lib/affiliate";
describe("level 2", () => {
  it("earns 10% for default affiliates", () => expect(subAffiliateShare(5000)).toBe(1000));
  it("is 0 for 90% partners", () => expect(subAffiliateShare(9000)).toBe(0));
});
