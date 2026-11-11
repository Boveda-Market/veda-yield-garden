import { describe, expect, it } from "vitest";
import { sendInput, spendable, toBaseUnits } from "@/lib/wallet-actions";

describe("wallet actions", () => {
  it("parses amounts into exact base units", () => {
    expect(toBaseUnits("1.5", "USDC")).toBe(1_500_000n);
    expect(toBaseUnits("0.000000001", "SOL")).toBe(1n);
    expect(toBaseUnits("1.0000001", "USDC")).toBeNull();
    expect(toBaseUnits("0", "SOL")).toBeNull();
  });
  it("keeps 0.01 SOL for network costs", () => {
    expect(spendable(50_000_000n, "SOL")).toBe(40_000_000n);
    expect(spendable(5_000_000n, "SOL")).toBe(0n);
    expect(spendable(5_000_000n, "USDC")).toBe(5_000_000n);
  });
  it("rejects sending to your own wallet", () => {
    const w = "93bF1K1dWMJseMuf15WLaNt1diVGACQ9gUFA7szsSbs7";
    expect(sendInput.safeParse({ from: w, to: w, asset: "SOL", amount: 1n }).success).toBe(false);
  });
});

import { swapFee } from "@/lib/wallet-actions";
describe("swap fee", () => {
  it("swaps carry no BÓVEDA fee", () => {
    expect(swapFee(100_000_000n)).toBe(0n);
  });
});
