import { describe, expect, it } from "vitest";
import { walletExtrasUsd } from "@/lib/wallet-holdings";

describe("walletExtrasUsd", () => {
  it("counts the network reserve at market price", () => {
    const r = walletExtrasUsd(63_232_839n, [], { SOL: 73.47 });
    expect(r.reserve).toBeCloseTo(4.6457, 3);
  });
  it("adds leftover coins at their price and stable dollars 1:1", () => {
    const r = walletExtrasUsd(0n, [{ symbol: "TRUMP", decimals: 6, raw: 109_787n }, { symbol: "JupUSD", decimals: 6, raw: 2_000_000n }], { TRUMP: 0.9, JupUSD: 1 });
    expect(r.coins).toBeCloseTo(0.0988 + 2, 3);
  });
  it("leaves out coins without a known price instead of guessing", () => {
    const r = walletExtrasUsd(1_000_000_000n, [{ symbol: "X", decimals: 6, raw: 5_000_000n }], {});
    expect(r.total).toBe(0);
  });
});
