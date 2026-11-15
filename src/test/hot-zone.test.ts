import { describe, expect, it } from "vitest";
import { hotZone } from "@/lib/hot-zone";

describe("zona caliente meter", () => {
  it("shows a centered price in the middle of the range", () => {
    expect(hotZone({ lower: 1000, upper: 1068, active: 1034 })).toEqual({ pct: 50, status: "center", side: null });
  });
  it("warns when the price is inside the outer 15% of the range", () => {
    expect(hotZone({ lower: 1000, upper: 1068, active: 1003 })?.status).toBe("edge");
    expect(hotZone({ lower: 1000, upper: 1068, active: 1066 })?.side).toBe("high");
  });
  it("pins an out-of-range price to the side it left", () => {
    expect(hotZone({ lower: 1000, upper: 1068, active: 1072 })).toEqual({ pct: 100, status: "out", side: "high" });
    expect(hotZone({ lower: 1000, upper: 1068, active: 990 })).toEqual({ pct: 0, status: "out", side: "low" });
  });
  it("shows nothing for invalid ranges", () => {
    expect(hotZone({ lower: 10, upper: 5, active: 7 })).toBeNull();
  });
});
