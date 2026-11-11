import { describe, expect, it } from "vitest";
import { solConvertLamports, unitsToDecimal } from "@/lib/onboarding";

const R = 10_000_000n; // 0.01 SOL reserve
describe("SOL → USDC percent conversion", () => {
  it("Todo converts everything except the network reserve", () => {
    expect(solConvertLamports(500_000_000n, R, 100n)).toBe(490_000_000n);
  });
  it("50% is half of the spendable SOL", () => {
    expect(solConvertLamports(510_000_000n, R, 50n)).toBe(250_000_000n);
  });
  it("25% and 75% use the spendable part", () => {
    expect(solConvertLamports(410_000_000n, R, 25n)).toBe(100_000_000n);
    expect(solConvertLamports(410_000_000n, R, 75n)).toBe(300_000_000n);
  });
  it("never converts when only the reserve is left", () => {
    expect(solConvertLamports(R, R, 100n)).toBe(0n);
  });
  it("formats amounts with a dot", () => {
    expect(unitsToDecimal(250_000_000n, 9)).toBe("0.25");
  });
});
