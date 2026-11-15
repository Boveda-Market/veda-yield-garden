import { describe, expect, it } from "vitest";
import { gasIsLow, refillCharge, refillLamports, treasuryCanRefill } from "@/lib/gas-refill";

describe("gas refill", () => {
  it("is low below 0.003 SOL", () => { expect(gasIsLow(2_999_999n)).toBe(true); expect(gasIsLow(3_000_000n)).toBe(false); });
  it("tops up to the 0.01 SOL reserve", () => { expect(refillLamports(0n)).toBe(10_000_000n); expect(refillLamports(1_000_000n)).toBe(9_000_000n); expect(refillLamports(5_000_000n)).toBe(0n); });
  it("charges market + 5% + 0.01 USDC", () => { expect(refillCharge(2_000_000n)).toBe(2_110_000n); });
  it("charges at least 0.05 USDC", () => { expect(refillCharge(1_000n)).toBe(50_000n); });
  it("tops a regular-vault deposit up to 0.02 SOL", () => { expect(refillLamports(2_500_000n, "deposit")).toBe(17_500_000n); expect(refillLamports(20_000_000n, "deposit")).toBe(0n); });
  it("treasury sponsors only while keeping its 0.003 SOL floor", () => { expect(treasuryCanRefill(13_000_000n, 10_000_000n, 3_000_000n)).toBe(true); expect(treasuryCanRefill(20_000_000n, 38_800_000n, 3_000_000n)).toBe(false); });
});
