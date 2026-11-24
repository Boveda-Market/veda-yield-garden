import { describe, it, expect } from "vitest";

import { rebalanceGainsUsd, autopilotNotice, gainsDestinationFromResult } from "./autopilot";
describe("rebalance earnings destination", () => {
  it("retains the downward wallet destination across delayed confirmation records", () => {
    expect(gainsDestinationFromResult("[1] Sin confirmación ·v=btc ·g=wallet")).toBe("wallet");
    expect(gainsDestinationFromResult("Rebalanceada ·v=btc ·g=vault")).toBe("vault");
    const now = Date.parse("2026-11-24T16:00:00Z");
    expect(autopilotNotice({ enabled: true, enabledAt: null, lastRebalanceAt: new Date(now - 60_000).toISOString(), lastGainsUsd: 30, lastGainsDestination: "wallet" }, now)?.gainsDestination).toBe("wallet");
  });
});
describe("rebalance absorbs wallet leftovers", () => {
  it("adds fees plus absorbed wallet tokens minus treasury fee", () => {
    // feeX 2 tokens @ $1.5, feeY $10, absorbed 4 tokens @ $1.5, fee $0.30 → 3 + 10 + 6 - 0.3 = 18.7
    expect(rebalanceGainsUsd(2_000_000n, 10_000_000n, 4_000_000n, 1.5, 300_000n)).toBeCloseTo(18.7, 6);
  });
  it("without leftovers only counts fees", () => {
    expect(rebalanceGainsUsd(2_000_000n, 10_000_000n, 0n, 1.5, 300_000n)).toBeCloseTo(12.7, 6);
  });
});
