import { describe, expect, it } from "vitest";
import { parsePoolYield } from "@/lib/pool-yield";

describe("Real pool yield", () => {
  const pool = { address: "pool-a", tvl: 100_000, fees: { "24h": 10 } };
  it("annualizes actual 24-hour fees without assuming compounding", () => {
    expect(parsePoolYield(pool, "pool-a")?.apr).toBeCloseTo(3.65, 8);
  });
  it("never uses another pool's yield", () => {
    expect(parsePoolYield(pool, "pool-b")).toBeNull();
  });
  it("keeps absent fees unavailable instead of substituting an illustrative APY", () => {
    expect(parsePoolYield({ address: "pool-a", tvl: 100_000 }, "pool-a")?.apr).toBeNull();
  });
  it("keeps zero fees as a real zero rate", () => {
    expect(parsePoolYield({ ...pool, fees: { "24h": 0 } }, "pool-a")?.apr).toBe(0);
  });
  it("does not calculate a rate with empty TVL", () => {
    expect(parsePoolYield({ ...pool, tvl: 0 }, "pool-a")?.apr).toBeNull();
  });
});