import { describe, expect, it } from "vitest";
import { change24hUsd } from "./position-value";
describe("change24hUsd", () => {
  it("coin up 25%: $100 of coin today was $80 yesterday → +$20", () => expect(change24hUsd("50", 2, 25)).toBeCloseTo(20));
  it("coin down 50%: $50 today was $100 → -$50", () => expect(change24hUsd("25", 2, -50)).toBeCloseTo(-50));
  it("unknown change stays unavailable", () => expect(change24hUsd("25", 2, null)).toBeNull());
});
import { changeSinceUsd, changeOverDaysUsd } from "./position-value";
describe("changeSinceUsd", () => {
  it("10 coins from $2 to $3 → +$10", () => expect(changeSinceUsd("10", 3, 2)).toBeCloseTo(10));
  it("missing past price stays unavailable", () => expect(changeSinceUsd("10", 3, null)).toBeNull());
});

describe("7-day and 30-day wallet market changes", () => {
  const day = 86_400_000;
  const now = Date.UTC(2026, 10, 27, 17);
  const midnight = Date.UTC(2026, 10, 27);
  const candles = [
    { t: midnight - 31 * day, c: 2 },
    { t: midnight - 30 * day, c: 8 },
    { t: midnight - 8 * day, c: 3 },
    { t: midnight - 7 * day, c: 9 },
  ];
  it("7 days uses the completed close before the cutoff: 10 × ($5 − $3) = $20", () => {
    expect(changeOverDaysUsd("10", 5, candles, 7, now)).toBe(20);
  });
  it("30 days uses its own completed close: 10 × ($5 − $2) = $30", () => {
    expect(changeOverDaysUsd("10", 5, candles, 30, now)).toBe(30);
  });
  it.each([7, 30] as const)("%i days never falls back to a younger pool's first candle", (days) => {
    expect(changeOverDaysUsd("10", 5, [{ t: now - 2 * day, c: 4 }], days, now)).toBeNull();
  });
  it("does not use an old close across a missing daily candle", () => {
    expect(changeOverDaysUsd("10", 5, [{ t: midnight - 10 * day, c: 4 }], 7, now)).toBeNull();
  });
  it("unavailable history never becomes zero", () => {
    expect(changeOverDaysUsd("10", 5, undefined, 30, now)).toBeNull();
  });
  it("invalid historical prices stay unavailable", () => {
    expect(changeOverDaysUsd("10", 5, [{ t: midnight - 8 * day, c: Infinity }], 7, now)).toBeNull();
  });
});
