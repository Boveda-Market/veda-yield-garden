import { describe, expect, it } from "vitest";
import { sellEstimate } from "@/lib/predict";

describe("early close estimate", () => {
  it("walks the best bids first and subtracts the venue fee", () => {
    // 9 contracts: 5 at 30¢ + 4 at 28¢ = $2.62, minus $0.19 fee.
    expect(sellEstimate([[28, 100], [30, 5]], 9_000_000n, 190_000n)).toBe(2_430_000n);
  });
  it("is unavailable when the bids cannot absorb the whole position", () => {
    expect(sellEstimate([[30, 2]], 9_000_000n, 0n)).toBeNull();
  });
});
