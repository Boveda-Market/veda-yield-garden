import { describe, expect, it } from "vitest";
import { cumulativeInterest } from "@/lib/pool-candles";

describe("cumulativeInterest", () => {
  it("always rises with volume, even when price falls", () => {
    const out = cumulativeInterest([{ t: 1, c: 10, v: 1000 }, { t: 2, c: 5, v: 3000 }], 0.01);
    expect(out).toEqual([10, 40]);
  });
});

describe("intradayGlobal", () => {
  it("moves each vault by its own price and keeps vaults without candles flat", async () => {
    const { intradayGlobal } = await import("@/lib/pool-candles");
    const out = intradayGlobal([
      { value: 100, candles: [{ t: 1, c: 1, v: 0 }, { t: 2, c: 2, v: 0 }] },
      { value: 50, candles: [] },
    ]);
    expect(out).toEqual([{ t: 1, v: 100 }, { t: 2, v: 150 }]);
  });
});
