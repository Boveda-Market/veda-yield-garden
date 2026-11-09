import { describe, expect, it } from "vitest";
import { profitFee, resolve, roundOf, validStake } from "./markets";

const p = { id: "x", market: "BTC" as const, window: "5m" as const, side: "up" as const, stake: 10, lock: 100_000, placedAt: 0, endsAt: 300_000 };

describe("prediction rounds", () => {
  it("5m rounds align to the clock and close entries in the last 20%", () => {
    expect(roundOf("5m", 310_000)).toMatchObject({ start: 300_000, end: 600_000 });
    expect(roundOf("5m", 300_000 + 239_000).entryOpen).toBe(true);
    expect(roundOf("5m", 300_000 + 241_000).entryOpen).toBe(false);
  });
  it("correct Up prediction pays 1.9x", () => {
    expect(resolve(p, 100_001)).toMatchObject({ outcome: "win", payout: 19 });
  });
  it("wrong prediction loses the stake; equal price refunds", () => {
    expect(resolve(p, 99_999).payout).toBe(0);
    expect(resolve({ ...p, side: "down" }, 99_999).outcome).toBe("win");
    expect(resolve(p, 100_000)).toMatchObject({ outcome: "tie", payout: 10 });
  });
  it("profit up to 10 is fee-free, 1.25% on the excess", () => {
    expect(profitFee(10)).toBe(0);
    expect(profitFee(50)).toBe(0.5);
    expect(resolve({ ...p, stake: 100 }, 100_001).payout).toBe(189);
  });
  it("minimum stake 5", () => {
    expect(validStake(4.99, 100)).toBe(false);
    expect(validStake(5, 100)).toBe(true);
  });
});
