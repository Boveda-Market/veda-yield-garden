import { describe, expect, it } from "vitest";
import { earningPace, earningRatePerMs, liveEstimate } from "@/lib/live-earnings";
describe("live earnings", () => {
  it("$1000 at 36.5% APR earns $1 per day", () => { expect(earningPace(earningRatePerMs(1000, 36.5)).perDay).toBeCloseTo(1, 9); });
  it("adds accrual since the verified read", () => { expect(liveEstimate(0.5, earningRatePerMs(1000, 36.5), 0, 86_400_000)).toBeCloseTo(1.5, 9); });
  it("no rate without APR", () => { expect(earningRatePerMs(1000, null)).toBe(0); });
});
