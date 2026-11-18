import { describe, expect, it } from "vitest";
import { cumulativeInterest } from "@/lib/pool-candles";

describe("cumulativeInterest", () => {
  it("always rises with volume, even when price falls", () => {
    const out = cumulativeInterest([{ t: 1, c: 10, v: 1000 }, { t: 2, c: 5, v: 3000 }], 0.01);
    expect(out).toEqual([10, 40]);
  });
});
