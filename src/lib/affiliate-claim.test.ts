import { describe, expect, it } from "vitest";
import { claimNet } from "./affiliate";

describe("affiliate self-claim", () => {
  it("blocks claims under 10 USDC", () => { expect(claimNet(9_999_999n)).toBeNull(); });
  it("sends the full amount; affiliate pays network costs in SOL", () => { expect(claimNet(10_000_000n)).toBe(10_000_000n); });
});
