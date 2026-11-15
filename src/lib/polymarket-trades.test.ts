import { describe, expect, it } from "vitest";
import { parseTradeMessage, tradePulse, type LiveTrade } from "./polymarket-trades";
import { roundStreak, upcomingOpens } from "./round-timeline";

const SLUG = "btc-updown-5m-1794707100";
const msg = (p: Record<string, unknown>) => JSON.stringify({ topic: "activity", type: "trades", timestamp: 1794707281616, payload: { eventSlug: SLUG, outcome: "Up", side: "BUY", size: 47.83, price: 0.82, timestamp: 1794707281, transactionHash: "0xabc", asset: "1", ...p } });

describe("live round trades", () => {
  it("turns a real buy into dollars spent on its side", () => {
    const [k] = parseTradeMessage(msg({}), SLUG);
    expect(k?.side).toBe("up");
    expect(k?.buy).toBe(true);
    expect(k?.usd).toBeCloseTo(39.2206, 4);
    expect(k?.t).toBe(1794707281000);
  });
  it("maps Down and sells correctly", () => {
    const [k] = parseTradeMessage(msg({ outcome: "Down", side: "SELL", size: 4.08, price: 0.15 }), SLUG);
    expect(k?.side).toBe("down");
    expect(k?.buy).toBe(false);
  });
  it("drops trades of other rounds, other topics and invalid numbers", () => {
    expect(parseTradeMessage(msg({ eventSlug: "btc-updown-5m-1" , slug: "btc-updown-5m-1" }), SLUG)).toEqual([]);
    expect(parseTradeMessage(JSON.stringify({ topic: "crypto_prices_chainlink", payload: {} }), SLUG)).toEqual([]);
    expect(parseTradeMessage(msg({ price: 0 }), SLUG)).toEqual([]);
    expect(parseTradeMessage(msg({ outcome: "Yes" }), SLUG)).toEqual([]);
    expect(parseTradeMessage("PONG", SLUG)).toEqual([]);
  });
  it("counts only buys inside the last minute", () => {
    const now = 1_000_000;
    const tr: LiveTrade[] = [
      { id: "a", t: now - 10_000, side: "up", usd: 10, buy: true },
      { id: "b", t: now - 20_000, side: "down", usd: 5, buy: true },
      { id: "c", t: now - 30_000, side: "up", usd: 99, buy: false },
      { id: "d", t: now - 61_000, side: "up", usd: 50, buy: true },
    ];
    expect(tradePulse(tr, now)).toEqual({ count: 2, usd: 15, up: 10, down: 5 });
  });
});

describe("round timeline", () => {
  it("streak counts the same winner in a row from the newest round", () => {
    expect(roundStreak([{ winner: "down" }, { winner: "up" }, { winner: "up" }, { winner: "up" }])).toEqual({ side: "up", count: 3 });
    expect(roundStreak([])).toBeNull();
  });
  it("next rounds open back to back", () => {
    expect(upcomingOpens(1000, 300)).toEqual([1000, 1300]);
  });
});
