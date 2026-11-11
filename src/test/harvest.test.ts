import { it, expect } from "vitest";
import { harvestAmounts } from "@/lib/harvest";
it("charges a flat 1% on harvests, no free allowance", () => { expect(harvestAmounts(10_000_000n).fee).toBe(100_000n); expect(harvestAmounts(50_000_000n)).toEqual({ gross: 50_000_000n, fee: 500_000n, net: 49_500_000n }); });
