import { expect, it } from "vitest";
import { harvestAmounts } from "@/lib/harvest";
it("harvests are free: user receives 100% of claimed dollars", () => { expect(harvestAmounts(10_000_000n)).toEqual({ gross: 10_000_000n, fee: 0n, net: 10_000_000n }); expect(harvestAmounts(30_000_000n, 5_000_000_000n).fee).toBe(0n); });
