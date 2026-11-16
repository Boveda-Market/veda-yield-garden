import { describe, expect, it } from "vitest";
import { AFFILIATE_SHARE_BPS, affiliateCommission, payoutProgress } from "./affiliate";
import { progressiveFee } from "./fees";

const usdc = (n: number) => BigInt(Math.round(n * 1e6));
const earn = (gross: number) => affiliateCommission(progressiveFee(usdc(gross)), AFFILIATE_SHARE_BPS);

describe("affiliate economics", () => {
  it("earns from the first dollar: 50% of the tiered exit fee", () => {
    expect(earn(10)).toBe(usdc(0.075));
    expect(earn(1000)).toBe(usdc(3.75));
  });
  it("payout requires 3 USDC accumulated", () => {
    expect(payoutProgress(usdc(1.5))).toEqual({ pct: 50, ready: false, missingRaw: usdc(1.5) });
    expect(payoutProgress(usdc(2.99)).ready).toBe(false);
    expect(payoutProgress(usdc(3)).ready).toBe(true);
  });
});

import { payoutsDue } from "./affiliate";
describe("payoutsDue", () => {
  it("only affiliates with 3 USDC or more pending are due", () => {
    const due = payoutsDue([{ affiliate_privy_id: "a", commission_raw: 2_000_000 }, { affiliate_privy_id: "a", commission_raw: 1_000_000 }, { affiliate_privy_id: "b", commission_raw: 2_999_999 }]);
    expect(due).toEqual([{ affiliate: "a", raw: 3_000_000n, count: 2 }]);
  });
});

import { createVipCodeRequest, VIP_CODE_MAX_USES } from "./affiliate";
describe("VIP codes", () => {
  const tk = "x".repeat(30);
  it("are single-use", () => expect(VIP_CODE_MAX_USES).toBe(1));
  it("accept 60%–90%", () => { expect(createVipCodeRequest.safeParse({ token: tk, code: "PARTNER80", shareBps: 8000 }).success).toBe(true); expect(createVipCodeRequest.safeParse({ token: tk, code: "PARTNER95", shareBps: 9500 }).success).toBe(false); expect(createVipCodeRequest.safeParse({ token: tk, code: "LOW50", shareBps: 5000 }).success).toBe(false); });
});

import { setAffiliateShareRequest } from "./affiliate";
describe("operator affiliate rate", () => {
  const tk = "x".repeat(30);
  it("allows 50%–90% only", () => { expect(setAffiliateShareRequest.safeParse({ token: tk, code: "ABC", shareBps: 5000 }).success).toBe(true); expect(setAffiliateShareRequest.safeParse({ token: tk, code: "ABC", shareBps: 9500 }).success).toBe(false); expect(setAffiliateShareRequest.safeParse({ token: tk, code: "ABC", shareBps: 4000 }).success).toBe(false); });
});
