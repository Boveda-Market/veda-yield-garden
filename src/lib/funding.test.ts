import { describe, expect, it } from "vitest";
import { fundingAction } from "./onboarding";
describe("Add funds route", () => {
  it("buys USDC directly once the 0.015 SOL network reserve is held", () => expect(fundingAction(15_000_000n)).toBe("usdc"));
  it("uses the starter purchase below the reserve", () => expect(fundingAction(14_999_999n)).toBe("starter"));
});
