import { describe, expect, it } from "vitest";
import { AFFILIATE_SHARE_BPS, affiliateCommission, payoutProgress } from "./affiliate";
import { progressiveFee } from "./fees";

const usdc = (n: number) => BigInt(Math.round(n * 1e6));
const earn = (gross: number) => affiliateCommission(progressiveFee(usdc(gross)), AFFILIATE_SHARE_BPS);

describe("affiliate economics", () => {
  it("earns from the first dollar: 50% of the flat 1% fee", () => {
    expect(earn(10)).toBe(usdc(0.05));
    expect(earn(1000)).toBe(usdc(5));
  });
  it("payout requires 10 USDC accumulated", () => {
    expect(payoutProgress(usdc(4.5))).toEqual({ pct: 45, ready: false, missingRaw: usdc(5.5) });
    expect(payoutProgress(usdc(10)).ready).toBe(true);
  });
});

import { payoutsDue } from "./affiliate";
describe("payoutsDue", () => {
  it("only affiliates with 10 USDC or more pending are due", () => {
    const due = payoutsDue([{ affiliate_privy_id: "a", commission_raw: 6_000_000 }, { affiliate_privy_id: "a", commission_raw: 4_000_000 }, { affiliate_privy_id: "b", commission_raw: 9_999_999 }]);
    expect(due).toEqual([{ affiliate: "a", raw: 10_000_000n, count: 2 }]);
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
