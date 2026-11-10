import { describe, expect, it } from "vitest";
import { withdrawalAmounts, withdrawalInput, prepareWithdrawalInput } from "@/lib/withdrawal";
import { FEE_WALLET } from "@/lib/fees";

describe("withdrawal rules", () => {
  it("is free up to 10 USDC and charges 1.25% on the excess of the protected minimum", () => {
    expect(withdrawalAmounts(1_000_000n).fee).toBe(0n);
    expect(withdrawalAmounts(10_000_000n).fee).toBe(0n);
    expect(withdrawalAmounts(110_000_000n)).toEqual({ gross: 110_000_000n, fee: 1_250_000n, net: 108_750_000n });
  });
  it("accepts supported wallets without a pilot allowlist and bounds reviewed integer amounts", () => {
    const input = { wallet: FEE_WALLET, position: FEE_WALLET, vaultId: "met", maximumFeeRaw: "10000", minimumNetRaw: "990000" };
    expect(prepareWithdrawalInput.safeParse(input).success).toBe(true);
    expect(prepareWithdrawalInput.safeParse({ ...input, maximumFeeRaw: "1".repeat(21) }).success).toBe(false);
  });
  it("does not accept negative proceeds", () => { expect(() => withdrawalAmounts(-1n)).toThrow(); });
  it("does not accept unvalidated Token-2022 vaults or execution overrides", () => {
    const input = { wallet: FEE_WALLET, position: FEE_WALLET, vaultId: "met" };
    expect(withdrawalInput.safeParse(input).success).toBe(true);
    expect(withdrawalInput.safeParse({ ...input, vaultId: "rwa" }).success).toBe(false);
    expect(withdrawalInput.safeParse({ ...input, send: true }).success).toBe(false);
  });
});
import { partialLiquidity as _pl, exitInput as _ei } from "@/lib/withdrawal";
describe("partial exit", () => {
  it("withdraws the chosen share of liquidity, floored", () => { expect(_pl(1001n, 50)).toBe(500n); expect(_pl(1000n, 100)).toBe(1000n); });
  it("defaults to full close and rejects 0%", () => {
    const base = { wallet: "GZ3wFmrMdXJAigwooa8GTginE6tLeTzgGLbXhgYTp7HR", position: "BnztueWcXv93mgW7yJe8WYpnCxpz34nujPhfjQT6SLu1", vaultId: "met" as const };
    expect(_ei.parse(base).percent).toBe(100);
    expect(_ei.safeParse({ ...base, percent: 0 }).success).toBe(false);
  });
});
