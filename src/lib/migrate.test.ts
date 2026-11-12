import { describe, it, expect } from "vitest";
import { bestUpgrade, breakEvenDays } from "./migrate";

describe("migrate", () => {
  it("suggests a vault at least 5 points higher", () => expect(bestUpgrade("sol", { sol: 18, met: 34 })).toEqual({ id: "met", apr: 34, gain: 16 }));
  it("does not suggest under 5 points", () => expect(bestUpgrade("sol", { sol: 18, met: 22.9 })).toBeNull());
  it("ignores unknown rates", () => expect(bestUpgrade("sol", { sol: null, met: 50 })).toBeNull());
  it("moving is fee-free, so it pays off from day one", () => expect(breakEvenDays(16)).toBe(0));
});

import { withdrawalAmounts } from "@/lib/withdrawal";
describe("voluntary vault change fee", () => {
  it("charges 0.10% on a voluntary change, 0% on an offer move, 0.40% VIP on a normal $10,000 exit", () => {
    expect(withdrawalAmounts(10_000_000_000n, "rotate").fee).toBe(10_000_000n);
    expect(withdrawalAmounts(10_000_000_000n, true).fee).toBe(0n);
    expect(withdrawalAmounts(10_000_000_000n).fee).toBe(40_000_000n);
  });
});
