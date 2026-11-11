import { describe, expect, it } from "vitest";
import { autoConvertLamports, GAS_KEEP_LAMPORTS } from "@/lib/onboarding";
describe("auto funding", () => {
  it("keeps 0.02 SOL and converts the rest of a 0.19 SOL purchase", () => {
    expect(GAS_KEEP_LAMPORTS).toBe(20_000_000n);
    expect(autoConvertLamports(190_000_000n)).toBe(170_000_000n);
  });
  it("converts nothing when balance is at or below the reserve", () => {
    expect(autoConvertLamports(20_000_000n)).toBe(0n);
  });
});
