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

import { rangeAlertDue, rebalanceSwapPlan, RANGE_ALERT_MS } from "@/lib/dlmm";
describe("range alerts", () => {
  it("waits 10 minutes out of range, then alerts once", () => {
    const now = Date.parse("2026-11-15T12:00:00Z");
    expect(rangeAlertDue(new Date(now - 9 * 60_000).toISOString(), false, now)).toBe(false);
    expect(rangeAlertDue(new Date(now - RANGE_ALERT_MS).toISOString(), false, now)).toBe(true);
    expect(rangeAlertDue(new Date(now - 60 * 60_000).toISOString(), true, now)).toBe(false);
  });
});
describe("50/50 rebalance plan", () => {
  it("sells half of an all-token position", () => {
    expect(rebalanceSwapPlan(1000n, 0n, 2)).toEqual({ swapForY: true, amountIn: 500n });
  });
  it("buys with half of an all-dollar position", () => {
    expect(rebalanceSwapPlan(0n, 1000n, 2)).toEqual({ swapForY: false, amountIn: 500n });
  });
  it("skips the swap when already balanced", () => {
    expect(rebalanceSwapPlan(500n, 1000n, 2).amountIn).toBe(0n);
  });
});

import { feesToUsdcSwapPlan } from "./dlmm";
describe("autopilot fees go in as dollars", () => {
  it("balances base 50/50 and converts token fees to USDC", () => {
    // base: 100 X @1 + 100 Y; fees: 20 X + 10 Y → keep 100 X, swap the 20 fee X to USDC
    expect(feesToUsdcSwapPlan(120n, 110n, 100n, 100n, 1)).toEqual({ swapForY: true, amountIn: 20n });
  });
  it("buys token only up to half the base value", () => {
    // base all USDC 200; fees 10 Y → buy 100 X worth, keep 110 USDC
    expect(feesToUsdcSwapPlan(0n, 210n, 0n, 200n, 1)).toEqual({ swapForY: false, amountIn: 100n });
  });
});

import { feesToTokenSwapPlan } from "./dlmm";
describe("autopilot fees go in as token when price rose", () => {
  it("buys token with fee dollars beyond half the base", () => {
    // base all USDC 200; fees 10 Y → keep 100 USDC, buy token with 110
    expect(feesToTokenSwapPlan(0n, 210n, 0n, 200n, 1)).toEqual({ swapForY: false, amountIn: 110n });
  });
  it("keeps token fees as token", () => {
    // base 100 X + 100 Y; fees 20 X → USDC already at target, no swap
    expect(feesToTokenSwapPlan(120n, 100n, 100n, 100n, 1).amountIn).toBe(0n);
  });
});
