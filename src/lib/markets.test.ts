import { describe, expect, it } from "vitest";
import { liquidationPrice, pnlOf, profitFee, settle, validLeverage, validStake } from "./markets";

const pos = { id: "x", market: "BTC" as const, side: "long" as const, stake: 10, leverage: 1000, entry: 100_000, openedAt: 0 };

describe("practice markets", () => {
  it("10 credits at 1000x moves like 10,000: +0.1% pays +10", () => {
    expect(pnlOf(pos, 100_100)).toBeCloseTo(10, 6);
  });
  it("short gains when price falls", () => {
    expect(pnlOf({ ...pos, side: "short" }, 99_900)).toBeCloseTo(10, 6);
  });
  it("liquidates at a 0.098% adverse move at 1000x and loses the whole stake", () => {
    expect(liquidationPrice(pos)).toBeCloseTo(99_902, 4);
    const r = settle(pos, 99_900, 1);
    expect(r.liquidated).toBe(true);
    expect(r.payout).toBe(0);
  });
  it("profit up to 10 is fee-free, 1.25% on the excess", () => {
    expect(profitFee(10)).toBe(0);
    expect(profitFee(50)).toBe(0.5);
  });
  it("stake minimum 5 and leverage 500–1000", () => {
    expect(validStake(4.99, 100)).toBe(false);
    expect(validStake(5, 100)).toBe(true);
    expect(validLeverage(499)).toBe(false);
    expect(validLeverage(1000)).toBe(true);
    expect(validLeverage(1001)).toBe(false);
  });
});
