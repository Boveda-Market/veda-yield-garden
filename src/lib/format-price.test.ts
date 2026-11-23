import { describe, expect, it } from "vitest";
import { formatCoinPrice } from "./format-price";

describe("formatCoinPrice", () => {
  it("shows Bitcoin-sized prices as whole dollars with commas", () => {
    expect(formatCoinPrice(61203.4)).toBe("$61,203");
  });
  it("shows mid prices with cents", () => {
    expect(formatCoinPrice(142.567)).toBe("$142.57");
  });
  it("never uses scientific notation for tiny prices", () => {
    expect(formatCoinPrice(0.0000001234)).toBe("$0.0000001234");
  });
  it("shows a dash when unknown", () => {
    expect(formatCoinPrice(null)).toBe("—");
  });
});
