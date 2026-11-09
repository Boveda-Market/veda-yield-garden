import { describe, it, expect } from "vitest";
import { compoundLiquidity, compoundSpendValid } from "@/lib/compound";

describe("compound both harvested tokens", () => {
  it("uses USDC-side liquidity when enough of the other token was harvested", () => {
    expect(compoundLiquidity({ liquidity: 1000n, tokenNeeded: 50n }, { liquidity: 3000n }, 80n)).toBe(990n);
  });
  it("uses token-side liquidity when the other token runs out first", () => {
    expect(compoundLiquidity({ liquidity: 1000n, tokenNeeded: 100n }, { liquidity: 500n }, 80n)).toBe(495n);
  });
  it("never spends more than harvested", () => {
    expect(compoundSpendValid(10n, 5n, 10n, 5n)).toBe(true);
    expect(compoundSpendValid(11n, 5n, 10n, 5n)).toBe(false);
    expect(compoundSpendValid(10n, 6n, 10n, 5n)).toBe(false);
  });
});
