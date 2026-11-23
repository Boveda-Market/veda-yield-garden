import { describe, expect, it } from "vitest";
import { priceMatchesSymbol } from "./pool-stats";

describe("priceMatchesSymbol", () => {
  it("recognizes the Bitcoin vault price whatever the letter case", () => {
    expect(priceMatchesSymbol("cbBTC", "cbBTC")).toBe(true);
    expect(priceMatchesSymbol("CBBTC", "cbBTC")).toBe(true);
  });
  it("rejects a different token", () => {
    expect(priceMatchesSymbol("TRUMP", "cbBTC")).toBe(false);
  });
});
