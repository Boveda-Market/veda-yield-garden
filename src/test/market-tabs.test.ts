import { describe, expect, it } from "vitest";
import { closesForDays, globalMarket } from "@/lib/pool-candles";
const D = 86_400_000;
describe("portfolio market tabs", () => {
  it("carries closes forward per day", () => {
    expect(closesForDays([{ t: 0, c: 1, v: 0 }, { t: 2 * D, c: 3, v: 0 }], [0, D, 2 * D])).toEqual([1, 1, 3]);
  });
  it("global line scales each vault by its own token price", () => {
    expect(globalMarket([{ value: 100, closes: [0.5, 1] }, { value: 50, closes: [2, 2] }], 2)).toEqual([100, 150]);
  });
});
