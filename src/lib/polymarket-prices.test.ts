import { describe, expect, it } from "vitest";
import { mergeTicks, parseFeedMessage } from "@/lib/polymarket-prices";
import { PRICE_TO_BEAT_VARIANT, roundSlug } from "@/lib/price-to-beat";

describe("Polymarket live prices", () => {
  it("reads a live Chainlink update for BTC", () => {
    const m = parseFeedMessage(JSON.stringify({ topic: "crypto_prices_chainlink", type: "update", payload: { symbol: "btc/usd", timestamp: 1794705398000, value: 62832.35 } }));
    expect(m).toEqual({ asset: "BTC", ticks: [{ t: 1794705398000, v: 62832.35 }] });
  });
  it("reads the opening snapshot of recent prices", () => {
    const m = parseFeedMessage(JSON.stringify({ topic: "crypto_prices_chainlink", type: "subscribe", payload: { symbol: "eth/usd", data: [{ timestamp: 1000, value: 1729.7 }, { timestamp: 2000, value: 1730.1 }] } }));
    expect(m?.asset).toBe("ETH");
    expect(m?.ticks).toHaveLength(2);
  });
  it("ignores other assets and exchange prices", () => {
    expect(parseFeedMessage(JSON.stringify({ topic: "crypto_prices_chainlink", payload: { symbol: "doge/usd", timestamp: 1, value: 0.05 } }))).toBeNull();
    expect(parseFeedMessage(JSON.stringify({ topic: "crypto_prices", payload: { symbol: "btcusdt", timestamp: 1, value: 62780 } }))).toBeNull();
  });
  it("keeps ticks in time order without duplicates", () => {
    const out = mergeTicks([{ t: 1000, v: 1 }, { t: 2000, v: 2 }], [{ t: 2000, v: 9 }, { t: 1500, v: 9 }, { t: 3000, v: 3 }]);
    expect(out.map((x) => x.t)).toEqual([1000, 2000, 3000]);
  });
});

describe("price to beat lookup", () => {
  it("builds the round slug Polymarket uses", () => {
    expect(roundSlug("BTC", "5m", 1794704100)).toBe("btc-updown-5m-1794704100");
  });
  it("maps each round length to Polymarket's opening-price name", () => {
    expect(PRICE_TO_BEAT_VARIANT).toEqual({ "5m": "fiveminute", "15m": "fifteen", "4h": "fourhour" });
  });
});

describe("one-minute average (how Polymarket sets the price to beat)", () => {
  it("averages only the minute before the opening", async () => {
    const { minuteAverage } = await import("@/lib/polymarket-prices");
    const open = 1_000_000;
    const ticks = Array.from({ length: 60 }, (_, i) => ({ t: open - 60_000 + i * 1000, v: i < 30 ? 100 : 200 }));
    ticks.push({ t: open, v: 9999 });
    expect(minuteAverage(ticks, open)).toBe(150);
  });
  it("gives nothing without enough prices in that minute", async () => {
    const { minuteAverage } = await import("@/lib/polymarket-prices");
    expect(minuteAverage([{ t: 1, v: 1 }], 1000)).toBeNull();
  });
});
