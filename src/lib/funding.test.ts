import { describe, expect, it } from "vitest";
import { fundingAction } from "./onboarding";
describe("Add funds route", () => {
  it("buys USDC directly once the 0.015 SOL network reserve is held", () => expect(fundingAction(15_000_000n)).toBe("usdc"));
  it("uses the starter purchase below the reserve", () => expect(fundingAction(14_999_999n)).toBe("starter"));
});

import { solExcessLamports, PAYOUT_MOVE_MIN_USD, SOL_EXCESS_MOVE_MIN_USD } from "./onboarding";
describe("move to available", () => {
  it("keeps the 0.015 SOL reserve", () => expect(solExcessLamports(40_000_000n)).toBe(25_000_000n));
  it("offers nothing at or below the reserve", () => expect(solExcessLamports(15_000_000n)).toBe(0n));
  it("minimums are $0.50 payouts and $2 SOL", () => { expect(PAYOUT_MOVE_MIN_USD).toBe(0.5); expect(SOL_EXCESS_MOVE_MIN_USD).toBe(2); });
});
