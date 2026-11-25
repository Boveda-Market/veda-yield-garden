import { describe, expect, it } from "vitest";
import { compoundExample } from "./compound-example";

describe("illustrative monthly compounding", () => {
  it("starts the $500 scenario at $500 for both paths", () => {
    expect(compoundExample(500, 2, 12).points[0]).toEqual({ month: 0, simple: 500, compound: 500 });
  });
  it("includes uninvested earnings in the simple total instead of showing flat growth", () => {
    expect(compoundExample(500, 2, 12).simple).toBe(620);
  });
  it("reinvests monthly at the chosen hypothetical rate", () => {
    expect(compoundExample(500, 2, 12).compound).toBeCloseTo(634.1208972813, 8);
    expect(compoundExample(500, 2, 12).extra).toBeCloseTo(14.1208972813, 8);
  });
  it("does not invent growth at zero interest", () => {
    expect(compoundExample(5000, 0, 12).compound).toBe(5000);
    expect(compoundExample(5000, 0, 12).extra).toBe(0);
  });
  it.each([3, 6, 12])("calculates the %i month horizon", (months) => {
    expect(compoundExample(100, 1, months).points).toHaveLength(months + 1);
    expect(compoundExample(100, 1, months).compound).toBeCloseTo(100 * 1.01 ** months);
  });
  it("scales the example with capital", () => {
    expect(compoundExample(1000, 2, 6).compound).toBe(2 * compoundExample(500, 2, 6).compound);
  });
  it("rejects non-finite and out-of-bounds assumptions", () => {
    expect(() => compoundExample(NaN, 2, 12)).toThrow(RangeError);
    expect(() => compoundExample(500, 6, 12)).toThrow(RangeError);
    expect(() => compoundExample(500, 2, 13)).toThrow(RangeError);
  });
});