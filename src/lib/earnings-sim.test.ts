import { describe, expect, it } from "vitest";
import { simulateEarnings, SIM_MIN_USD } from "@/lib/earnings-sim";

describe("Simular ganancias", () => {
  it("uses simple interest: $100 at 365% APR earns $1 a day and $30 in 30 days", () => {
    const r = simulateEarnings(100, 365);
    expect(r?.perDay).toBeCloseTo(1, 10);
    expect(r?.perMonth).toBeCloseTo(30, 10);
  });
  it("keeps the rate unavailable instead of inventing one", () => {
    expect(simulateEarnings(100, null)).toBeNull();
  });
  it("does not simulate empty amounts", () => {
    expect(simulateEarnings(0, 100)).toBeNull();
  });
  it("starts at the $20 first-deposit minimum", () => {
    expect(SIM_MIN_USD).toBe(20);
  });
});
