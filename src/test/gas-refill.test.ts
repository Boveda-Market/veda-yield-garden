import { describe, expect, it } from "vitest";
import { activationCharge, activationShortfallMicro, gasIsLow, refillCharge, refillLamports, treasuryCanRefill } from "@/lib/gas-refill";

describe("gas refill", () => {
  it("is low below 0.003 SOL", () => { expect(gasIsLow(2_999_999n)).toBe(true); expect(gasIsLow(3_000_000n)).toBe(false); });
  it("tops up to the 0.01 SOL reserve", () => { expect(refillLamports(0n)).toBe(10_000_000n); expect(refillLamports(1_000_000n)).toBe(9_000_000n); expect(refillLamports(5_000_000n)).toBe(0n); });
  it("charges market + 5% + 0.01 USDC", () => { expect(refillCharge(2_000_000n)).toBe(2_110_000n); });
  it("charges at least 0.05 USDC", () => { expect(refillCharge(1_000n)).toBe(50_000n); });
  it("tops a regular-vault deposit up to 0.02 SOL", () => { expect(refillLamports(2_500_000n, "deposit")).toBe(17_500_000n); expect(refillLamports(20_000_000n, "deposit")).toBe(0n); });
  it("treasury sponsors only while keeping its 0.003 SOL floor", () => { expect(treasuryCanRefill(13_000_000n, 10_000_000n, 3_000_000n)).toBe(true); expect(treasuryCanRefill(20_000_000n, 38_800_000n, 3_000_000n)).toBe(false); });
});

describe("first-time activation", () => {
  it("charges reserve market value plus exactly $5", () => expect(activationCharge(8_800_000n)).toBe(13_800_000n));
  it("charges reserve market value plus exactly $2 for an additional vault", () => expect(activationCharge(8_800_000n, true)).toBe(10_800_000n));
  it("delivers 0.065 SOL from an empty wallet", () => expect(refillLamports(0n, "vault")).toBe(65_000_000n));
  it("asks for the missing dollars below $20", () => {
    expect(activationShortfallMicro(12_000_000n)).toBe(8_000_000n);
    expect(activationShortfallMicro(20_000_000n)).toBe(0n);
  });
});


describe("Doble o Nada activation need", () => {
  it("asks for the bet plus $15 when the account still has to be activated", async () => {
    const { playActivationNeedMicro } = await import("@/lib/gas-refill");
    expect(playActivationNeedMicro(10_000_000n)).toBe(25_000_000n);
  });
});
