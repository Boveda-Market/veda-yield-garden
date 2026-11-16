import { it, expect } from "vitest";
import { harvestAmounts } from "@/lib/harvest";
it("charges the 1% Basic-tier harvest fee", () => { expect(harvestAmounts(10_000_000n).fee).toBe(100_000n); expect(harvestAmounts(50_000_000n)).toEqual({ gross: 50_000_000n, fee: 500_000n, net: 49_500_000n }); });
it("uses the position value to set the harvest tier", () => { expect(harvestAmounts(30_000_000n, 5_000_000_000n).fee).toBe(75_000n); expect(harvestAmounts(30_000_000n, 200_000_000n).fee).toBe(225_000n); expect(harvestAmounts(30_000_000n, 10_000_000n).fee).toBe(300_000n); });
