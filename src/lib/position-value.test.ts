import { describe, expect, it } from "vitest";
import { estimateUsd, formatUsd } from "./position-value";

describe("estimateUsd", () => {
  it("values tokens at price plus USDC", () => expect(estimateUsd("0.5", "10", 100)).toBe(60));
  it("is unavailable without a price", () => expect(estimateUsd("0.5", "10", null)).toBeNull());
  it("is unavailable without token amounts", () => expect(estimateUsd(null, "10", 100)).toBeNull());
  it("formats tiny values", () => expect(formatUsd(0.004)).toBe("<$0.01"));
});
