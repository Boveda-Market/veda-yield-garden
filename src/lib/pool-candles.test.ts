import { describe, expect, it } from "vitest";
import { MIN_DENSE, RANGE_RES } from "./pool-candles";

describe("chart timeframes", () => {
  it("1H uses 1-hour candles", () => { expect(RANGE_RES["1h"]).toMatchObject({ tf: "hour", agg: 1 }); });
  it("4H uses 4-hour candles", () => { expect(RANGE_RES["4h"]).toMatchObject({ tf: "hour", agg: 4 }); });
  it("1D uses daily candles", () => { expect(RANGE_RES["1d"]).toMatchObject({ tf: "day", agg: 1 }); });
  it("only 1M, 1H, 4H and 1D exist", () => { expect(Object.keys(RANGE_RES)).toEqual(["1m", "1h", "4h", "1d"]); });
  it("1M uses 1-minute candles", () => { expect(RANGE_RES["1m"]).toMatchObject({ tf: "minute", agg: 1 }); });
  it("density floor", () => { expect(MIN_DENSE).toBe(10); });
});
