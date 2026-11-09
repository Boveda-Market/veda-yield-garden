import { describe, expect, it } from "vitest";
import { decimalToUnits, onboardingStep } from "@/lib/onboarding";

describe("new-user funding guide", () => {
  it("asks for SOL first when below 0.015 SOL, even with USDC", () => {
    expect(onboardingStep(decimalToUnits("0.0149", 9)!, decimalToUnits("50", 6)!)).toBe("sol");
  });
  it("asks for USDC once SOL covers network costs", () => {
    expect(onboardingStep(decimalToUnits("0.015", 9)!, decimalToUnits("0.99", 6)!)).toBe("usdc");
  });
  it("hides the guide with at least 0.015 SOL and 1 USDC", () => {
    expect(onboardingStep(decimalToUnits("0.02", 9)!, decimalToUnits("1", 6)!)).toBeNull();
  });
  it("parses wallet decimal strings including zero", () => {
    expect(decimalToUnits("0", 9)).toBe(0n);
    expect(decimalToUnits("1.5", 6)).toBe(1_500_000n);
    expect(decimalToUnits("abc", 6)).toBeNull();
  });
});
