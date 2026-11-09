import { describe, expect, it } from "vitest";
import { collateralMint, perpOpenFee, validLeverage, validPerpAmount } from "./perps";

describe("live perps rules", () => {
  it("opening is free up to 10 USDC", () => expect(perpOpenFee(10_000_000n)).toBe(0n));
  it("charges 1.25% only above 10 USDC", () => expect(perpOpenFee(100_000_000n)).toBe(1_125_000n));
  it("pilot amount is 10 to 100 USDC", () => {
    expect(validPerpAmount(9_999_999n)).toBe(false);
    expect(validPerpAmount(100_000_001n)).toBe(false);
    expect(validPerpAmount(50_000_000n)).toBe(true);
  });
  it("leverage is 2x to 50x", () => { expect(validLeverage(1)).toBe(false); expect(validLeverage(51)).toBe(false); expect(validLeverage(10)).toBe(true); });
  it("shorts use USDC collateral", () => expect(collateralMint("BTC", "short")).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"));
});
