import { describe, expect, it } from "vitest";
import { MARKET_ID_RE, assetOfTitle, potentialProfit, validPredictAmount, windowOfDuration, windowOfSlug, windowOfTags } from "./predict";

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
  it("only 5m, 15m and 4h windows", () => {
    expect(windowOfTags(["crypto", "5m"])).toBe("5m");
    expect(windowOfTags(["crypto", "4h"])).toBe("4h");
    expect(windowOfTags(["crypto", "daily"])).toBeNull();
    // 4 h rounds reach the app untagged: the slug and the exact round length identify them instead.
    expect(windowOfSlug("btc-updown-4h-1794603600")).toBe("4h");
    expect(windowOfSlug("sol-updown-15m-1794610800")).toBe("15m");
    expect(windowOfSlug("solana-up-or-down-on-november-14-2026")).toBeNull();
    expect(windowOfDuration(14400)).toBe("4h");
    expect(windowOfDuration(300)).toBe("5m");
    expect(windowOfDuration(86400)).toBeNull();
  });
  it("profit is contracts minus cost", () => expect(potentialProfit({ contractsMicro: "19000000", costMicro: "10000000" })).toBe(9_000_000n));
});

import { predictSummary as _ps, pricePerContract as _ppc } from "./predict";
describe("predictSummary", () => {
  const base = { pubkey: "x", marketId: "POLY-1-0", title: "", side: "up" as const, outcome: "Up", contractsMicro: "10000000", closeTime: null, result: null };
  it("sums open stake, value and payout; realized only from closed", () => {
    const s = _ps([
      { ...base, status: "open", costMicro: "5000000", valueMicro: "6000000", payoutMicro: "10000000", pnlMicro: "1000000" },
      { ...base, status: "closed", costMicro: "5000000", valueMicro: null, payoutMicro: "10000000", pnlMicro: "-5000000" },
    ]);
    expect(s.atStake).toBe(5000000n); expect(s.openValue).toBe(6000000n); expect(s.potential).toBe(10000000n); expect(s.realized).toBe(-5000000n); expect(s.open).toBe(1); expect(s.closed).toBe(1);
  });
  it("price per contract", () => { expect(_ppc({ costMicro: "5000000", contractsMicro: "10000000" })).toBe(0.5); });
});

import { positionWon, parsePastRound } from "./predict";
describe("prediction results", () => {
  it("a resolved 'yes' on the bought market is a win", () => {
    expect(positionWon({ result: "yes", isYes: true })).toBe(true);
    expect(positionWon({ result: "no", isYes: true })).toBe(false);
    expect(positionWon({ result: null })).toBeNull();
  });
  it("parses only resolved BTC/ETH/SOL rounds", () => {
    const m = [{ outcomes: '["Up","Down"]', outcomePrices: '["0","1"]' }];
    expect(parsePastRound({ slug: "btc-updown-5m-1", title: "Bitcoin Up or Down - November 9, 7:55PM-8:00PM ET", endDate: "2026-11-10T01:00:00Z", markets: m })?.winner).toBe("down");
    expect(parsePastRound({ slug: "eth-updown-4h-1", title: "Ethereum Up or Down - November 9, 4:00PM-8:00PM ET", endDate: "2026-11-10T01:00:00Z", markets: m })?.window).toBe("4h");
    expect(parsePastRound({ slug: "solana-up-or-down-on-november-9-2026", title: "Solana Up or Down on November 9?", endDate: "2026-11-10T01:00:00Z", markets: m })).toBeNull();
    expect(parsePastRound({ slug: "xrp-updown-5m-1", title: "XRP Up or Down - November 9", endDate: "2026-11-10T01:00:00Z", markets: m })).toBeNull();
    expect(parsePastRound({ slug: "btc-updown-5m-1", title: "Bitcoin Up or Down - x", endDate: "2026-11-10T01:00:00Z", markets: [{ outcomes: '["Up","Down"]', outcomePrices: '["0.5","0.5"]' }] })).toBeNull();
  });
});
