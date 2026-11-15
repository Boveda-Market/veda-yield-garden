import { describe, expect, it } from "vitest";
import { canHarvest, HARVEST_MIN_USD } from "@/lib/harvest";

describe("harvest minimum", () => {
  it("unlocks at $0.50", () => {
    expect(HARVEST_MIN_USD).toBe(0.5);
    expect(canHarvest(0.49)).toBe(false);
    expect(canHarvest(0.5)).toBe(true);
    expect(canHarvest(null)).toBe(true);
  });
});
