import { describe, expect, it } from "vitest";
import { playNeedsActivation } from "@/lib/gas-refill";

describe("Doble o Nada activation", () => {
  it("is not quoted when the account already has the 0.01 operations reserve", () => {
    expect(playNeedsActivation(10_000_000n)).toBe(false);
    expect(playNeedsActivation(40_000_000n)).toBe(false);
  });
  it("is quoted only when the reserve is too low to play", () => {
    expect(playNeedsActivation(9_999_999n)).toBe(true);
    expect(playNeedsActivation(0n)).toBe(true);
  });
});
