import { describe, it, expect } from "vitest";
import { depositQuote } from "@/lib/deposit-quote";

describe("depositQuote", () => {
  it("activation goes on top when the balance covers it: the vault gets the full typed amount", () => {
    const q = depositQuote(100_000_000n, 6_420_000n, 5_000_000n, { balanceMicro: 200_000_000n, swaps: false });
    expect(q.net).toBe(100_000_000n); expect(q.onTop).toBe(true); expect(q.total).toBe(106_420_000n); expect(q.fee).toBe(5_000_000n); expect(q.reserve).toBe(1_420_000n);
  });
  it("short balance: deposit shrinks to what is left after the activation", () => {
    const q = depositQuote(100_000_000n, 6_420_000n, 5_000_000n, { balanceMicro: 100_000_000n, swaps: false });
    expect(q.net).toBe(93_580_000n); expect(q.onTop).toBe(false); expect(q.total).toBe(100_000_000n);
  });
  it("unknown balance quotes conservatively (activation from the same dollars)", () => {
    expect(depositQuote(20_000_000n, 6_420_000n, 5_000_000n).net).toBe(13_580_000n);
  });
  it("no activation: everything goes in", () => { expect(depositQuote(20_000_000n, null, 5_000_000n, { swaps: false }).inVault).toBe(20_000_000n); });
  it("new position: market fee on the swapped half plus 0.2% margin", () => {
    // $100, fee 0.1%: half $50 × (0.10% + 0.20%) = $0.15
    const q = depositQuote(100_000_000n, null, 0n, { balanceMicro: 100_000_000n, feePct: 0.1 });
    expect(q.swapCost).toBe(150_000n); expect(q.inVault).toBe(99_850_000n);
  });
  it("adding to an existing position in range has no swap cost", () => { expect(depositQuote(100_000_000n, null, 0n, { feePct: 0.1, swaps: false }).swapCost).toBe(0n); });
  it("never goes below zero", () => { expect(depositQuote(3_000_000n, 6_000_000n, 5_000_000n).net).toBe(0n); });
});
