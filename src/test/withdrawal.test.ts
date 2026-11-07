import { describe, expect, it } from "vitest";
import { withdrawalAmounts, withdrawalInput, isWithdrawalPilot, WITHDRAWAL_PILOT } from "@/lib/withdrawal";
import { FEE_WALLET } from "@/lib/fees";

describe("withdrawal rules", () => {
  it("charges exactly 1% of the protected minimum in integer micro-USDC", () => {
    expect(withdrawalAmounts(1_000_000n)).toEqual({ gross: 1_000_000n, fee: 10_000n, net: 990_000n });
    expect(withdrawalAmounts(1_234_567n)).toEqual({ gross: 1_234_567n, fee: 12_345n, net: 1_222_222n });
  });
  it("limits signable liquidation to the authorized owner's SOL pilot position", () => {
    expect(isWithdrawalPilot(WITHDRAWAL_PILOT)).toBe(true);
    expect(isWithdrawalPilot({ ...WITHDRAWAL_PILOT, wallet: FEE_WALLET })).toBe(false);
    expect(isWithdrawalPilot({ ...WITHDRAWAL_PILOT, position: FEE_WALLET })).toBe(false);
    expect(isWithdrawalPilot({ ...WITHDRAWAL_PILOT, vaultId: "met" })).toBe(false);
  });
  it("does not accept negative proceeds", () => { expect(() => withdrawalAmounts(-1n)).toThrow(); });
  it("does not accept unvalidated Token-2022 vaults or execution overrides", () => {
    const input = { wallet: FEE_WALLET, position: FEE_WALLET, vaultId: "met" };
    expect(withdrawalInput.safeParse(input).success).toBe(true);
    expect(withdrawalInput.safeParse({ ...input, vaultId: "rwa" }).success).toBe(false);
    expect(withdrawalInput.safeParse({ ...input, send: true }).success).toBe(false);
  });
});