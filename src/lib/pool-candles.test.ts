import { describe, expect, it } from "vitest";
import { MIN_DENSE, RANGE_RES } from "./pool-candles";

describe("chart ranges", () => {
  it("1 h uses 1-minute candles covering the full hour", () => {
    expect(RANGE_RES["1h"]).toMatchObject({ tf: "minute", agg: 1, count: 60, ms: 3_600_000 });
  });
  it("24 h uses 5-minute candles (allowed aggregate) for a full day in one request", () => {
    expect(RANGE_RES["24h"]).toMatchObject({ tf: "minute", agg: 5, count: 288 });
  });
  it("sparse answers below the density floor are never drawn", () => {
    expect(MIN_DENSE).toBe(10);
  });
});
