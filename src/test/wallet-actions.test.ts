import { describe, expect, it } from "vitest";
import { sendInput, spendable, toBaseUnits, SWAP_TOKENS, transferToken } from "@/lib/wallet-actions";

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
  it("allows sending every coin available for swapping, not arbitrary coins", () => {
    const from = "7eAb9SwyxdZj6jr88pMAnGAG41iPgMNa67xGT377zFT7", to = "GZ3wFmrMdXJAigwooa8GTginE6tLeTzgGLbXhgYTp7HR";
    for (const token of SWAP_TOKENS) expect(sendInput.safeParse({ from, to, asset: token.symbol, amount: 1n }).success).toBe(true);
    expect(sendInput.safeParse({ from, to, asset: "SPCX", amount: 1n }).success).toBe(false);
  });
  it("preserves each coin's exact precision for sends", () => {
    expect(toBaseUnits("0.00000001", "cbBTC")).toBe(1n);
    expect(toBaseUnits("0.00001", "BONK")).toBe(1n);
    expect(toBaseUnits("1.000001", "DCTY")).toBe(1_000_001n);
    expect(toBaseUnits("0.000001", "BONK")).toBeNull();
  });
  it("uses the validated Token-2022 program only for DCTY", () => {
    expect(transferToken("DCTY").token2022).toBe(true);
    expect(transferToken("DCTY").mint).toBe("9hjBLBrc7WZW2H8UQvBAvG5WiTZotXUv2Bdcn4f4pump");
    expect(transferToken("TRUMP").token2022).toBe(false);
  });
});

import { swapFee } from "@/lib/wallet-actions";
describe("swap fee", () => {
  it("swaps carry no Bóveda Market fee", () => {
    expect(swapFee(100_000_000n)).toBe(0n);
  });
});
