import { describe, expect, it } from "vitest";
import { pickWalletRead } from "@/hooks/use-real-wallet";
import type { RealWalletResult } from "@/lib/solana-data";

const read = (positions: number, complete = true): RealWalletResult => ({ success: true, data: { wallet: "w", sol: "0.02", usdc: "0.03", positions: Array.from({ length: positions }, (_, i) => ({ address: `p${i}`, vaultId: "sol", symbol: "SOL", tokenAmount: "0.05", usdcAmount: "0.14", feeTokenAmount: "0", feeUsdcAmount: "0", locked: false })), positionsComplete: complete, checkedAt: "" } });

describe("shared wallet read", () => {
  it("keeps the last complete positions when a newer read is incomplete", () => expect(pickWalletRead(read(0, false), read(1))).toEqual(read(1)));
  it("keeps the last complete positions when a newer read failed", () => expect(pickWalletRead({ success: false, error: "x" }, read(1))).toEqual(read(1)));
  it("accepts a complete read even when positions were closed", () => expect(pickWalletRead(read(0), read(1))).toEqual(read(0)));
  it("shows the failure when there is no earlier good read", () => expect(pickWalletRead({ success: false, error: "x" }, undefined)).toEqual({ success: false, error: "x" }));
});
