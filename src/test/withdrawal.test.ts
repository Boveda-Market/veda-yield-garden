import { describe, expect, it } from "vitest";
import { withdrawalAmounts, withdrawalInput } from "@/lib/withdrawal";
import { FEE_WALLET } from "@/lib/fees";

describe("withdrawal rules", () => {
  it("charges exactly 1% of realized USDC in integer micro-USDC", () => {
    expect(withdrawalAmounts(1_000_000n)).toEqual({ gross: 1_000_000n, fee: 10_000n, net: 990_000n });
    expect(withdrawalAmounts(1_234_567n)).toEqual({ gross: 1_234_567n, fee: 12_345n, net: 1_222_222n });
  });
  it("does not accept negative proceeds", () => { expect(() => withdrawalAmounts(-1n)).toThrow(); });
  it("does not accept unvalidated Token-2022 vaults or execution overrides", () => {
    const input = { wallet: FEE_WALLET, position: FEE_WALLET, vaultId: "met" };
    expect(withdrawalInput.safeParse(input).success).toBe(true);
    expect(withdrawalInput.safeParse({ ...input, vaultId: "rwa" }).success).toBe(false);
    expect(withdrawalInput.safeParse({ ...input, send: true }).success).toBe(false);
  });
});