import { describe, expect, it } from "vitest";
import { MARKET_ID_RE, assetOfTitle, potentialProfit, validPredictAmount, windowOfTags } from "./predict";

describe("live prediction rules", () => {
  it("accepts 5 to 250 USDC only", () => {
    expect(validPredictAmount(4_999_999n)).toBe(false);
    expect(validPredictAmount(250_000_001n)).toBe(false);
    expect(validPredictAmount(5_000_000n)).toBe(true);
  });
  it("only exact Polymarket market ids", () => {
    expect(MARKET_ID_RE.test("POLY-6885961-0")).toBe(true);
    expect(MARKET_ID_RE.test("BISON-abc-UP")).toBe(false);
  });
  it("only BTC, ETH and SOL up/down rounds", () => {
    expect(assetOfTitle("Ethereum Up or Down - November 9, 6:50PM-6:55PM ET")).toBe("ETH");
    expect(assetOfTitle("Solana Up or Down - November 9")).toBe("SOL");
    expect(assetOfTitle("XRP Up or Down - November 9")).toBeNull();
    expect(assetOfTitle("What price will Bitcoin hit in November?")).toBeNull();
  });
  it("only 5m, 15m and 1h windows", () => {
    expect(windowOfTags(["crypto", "5m"])).toBe("5m");
    expect(windowOfTags(["crypto", "1h"])).toBe("1h");
    expect(windowOfTags(["crypto", "4h"])).toBeNull();
  });
  it("profit is contracts minus cost", () => expect(potentialProfit({ contractsMicro: "19000000", costMicro: "10000000" })).toBe(9_000_000n));
});
