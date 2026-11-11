import { describe, expect, it } from "vitest";
import { claimNet } from "./affiliate";

describe("affiliate self-claim", () => {
  it("blocks claims under 10 USDC", () => { expect(claimNet(9_999_999n)).toBeNull(); });
  it("deducts a flat 0.10 USDC network cost", () => { expect(claimNet(10_000_000n)).toBe(9_900_000n); });
});
