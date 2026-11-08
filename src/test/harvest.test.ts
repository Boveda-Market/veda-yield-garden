import { expect, it } from "vitest";
import { harvestAmounts } from "@/lib/harvest";
it("charges 1% floored on claimed USDC", () => { expect(harvestAmounts(12_345n)).toEqual({ gross: 12_345n, fee: 123n, net: 12_222n }); });
it("charges nothing below 100 micro-USDC", () => { expect(harvestAmounts(99n).fee).toBe(0n); });
