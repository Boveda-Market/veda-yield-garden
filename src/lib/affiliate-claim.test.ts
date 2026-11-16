import { describe, expect, it } from "vitest";
import { claimNet } from "./affiliate";

describe("affiliate self-claim", () => {
  it("blocks claims under 3 USDC", () => { expect(claimNet(2_999_999n)).toBeNull(); });
  it("sends the full amount; affiliate pays network costs in SOL", () => { expect(claimNet(3_000_000n)).toBe(3_000_000n); });
});
