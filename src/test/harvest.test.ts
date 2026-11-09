import { it, expect } from "vitest";
import { harvestAmounts } from "@/lib/harvest";
it("charges nothing on harvests up to 10 USDC", () => { expect(harvestAmounts(10_000_000n).fee).toBe(0n); });
it("charges 1.25% only above 10 USDC", () => { expect(harvestAmounts(50_000_000n)).toEqual({ gross: 50_000_000n, fee: 500_000n, net: 49_500_000n }); });
