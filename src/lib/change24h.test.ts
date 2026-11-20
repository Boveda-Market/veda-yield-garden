import { describe, expect, it } from "vitest";
import { change24hUsd } from "./position-value";
describe("change24hUsd", () => {
  it("coin up 25%: $100 of coin today was $80 yesterday → +$20", () => expect(change24hUsd("50", 2, 25)).toBeCloseTo(20));
  it("coin down 50%: $50 today was $100 → -$50", () => expect(change24hUsd("25", 2, -50)).toBeCloseTo(-50));
  it("unknown change stays unavailable", () => expect(change24hUsd("25", 2, null)).toBeNull());
});
import { changeSinceUsd } from "./position-value";
describe("changeSinceUsd", () => {
  it("10 coins from $2 to $3 → +$10", () => expect(changeSinceUsd("10", 3, 2)).toBeCloseTo(10));
  it("missing past price stays unavailable", () => expect(changeSinceUsd("10", 3, null)).toBeNull());
});
