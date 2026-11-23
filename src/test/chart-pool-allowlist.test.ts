import { describe, expect, it } from "vitest";
import { isChartPool } from "@/lib/pool-candles.functions";
import { VAULTS } from "@/lib/vaults";

describe("chart candles only for app vault pools", () => {
  it("accepts every listed vault pool", () => {
    for (const v of VAULTS) expect(isChartPool(v.pool)).toBe(true);
  });
  it("rejects a valid-looking pool that is not one of the app's vaults", () => {
    expect(isChartPool("So11111111111111111111111111111111111111112")).toBe(false);
  });
});
