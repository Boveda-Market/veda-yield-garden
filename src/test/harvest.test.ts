import { it, expect } from "vitest";
import { harvestAmounts } from "@/lib/harvest";
it("charges the 3% Basic-tier harvest fee", () => { expect(harvestAmounts(10_000_000n).fee).toBe(300_000n); expect(harvestAmounts(50_000_000n)).toEqual({ gross: 50_000_000n, fee: 1_500_000n, net: 48_500_000n }); });
it("ignores the position value: tier comes only from the harvested amount", () => { expect(harvestAmounts(30_000_000n, 5_000_000_000n).fee).toBe(900_000n); expect(harvestAmounts(200_000_000n, 5_000_000_000n).fee).toBe(4_500_000n); });
