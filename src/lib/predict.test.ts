import { describe, expect, it } from "vitest";
import { MARKET_ID_RE, potentialProfit, validPredictAmount } from "./predict";

describe("live prediction rules", () => {
  it("accepts 5 to 250 USDC only", () => {
    expect(validPredictAmount(4_999_999n)).toBe(false);
    expect(validPredictAmount(250_000_001n)).toBe(false);
    expect(validPredictAmount(5_000_000n)).toBe(true);
  });
  it("only exact Forecast up/down market ids", () => {
    expect(MARKET_ID_RE.test("POLY-6274257")).toBe(true);
    expect(MARKET_ID_RE.test("BISON-abc-UP")).toBe(false);
  });
  it("profit is contracts minus cost", () => expect(potentialProfit({ contractsMicro: "19000000", costMicro: "10000000" })).toBe(9_000_000n));
});
