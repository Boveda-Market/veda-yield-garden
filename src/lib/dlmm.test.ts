import { describe, expect, it } from "vitest";
import { binsMoved, dlmmRange, dlmmSlippagePct, DLMM_HALF_WIDTH } from "./dlmm";
import { bestUpgrade } from "./migrate";
import { refillLamports } from "./gas-refill";

describe("range vault rules", () => {
  it("opens 69 bins centred on the post-swap price", () => {
    expect(dlmmRange(-1485, 2)).toEqual({ min: -1517, max: -1449 });
    const r = dlmmRange(0, 0);
    expect(r.max - r.min + 1).toBe(2 * DLMM_HALF_WIDTH + 1);
  });
  it("counts whole bins moved at 0.8% steps", () => {
    expect(binsMoved(1, 1.008, 80)).toBe(1);
    expect(binsMoved(1, 1.009, 80)).toBe(2);
    expect(binsMoved(1, 0.99, 80)).toBe(0);
  });
  it("tolerates the expected move plus 3 bins", () => expect(dlmmSlippagePct(2, 80)).toBe(4));
  it("never suggests moving into or out of the GTA6 vault", () => {
    expect(bestUpgrade("sol", { sol: 18, met: 20, gta6: 1200 })).toBeNull();
    expect(bestUpgrade("gta6", { sol: 18, met: 2000, gta6: 100 })).toBeNull();
  });
  it("tops the reserve up to 0.065 SOL for the vault guarantee", () => {
    expect(refillLamports(10_000_000n, "vault")).toBe(55_000_000n);
    expect(refillLamports(70_000_000n, "vault")).toBe(0n);
  });
});
