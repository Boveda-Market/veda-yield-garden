import { describe, expect, it } from "vitest";
import { positionLeading, positionOdds, type LiveRound } from "@/lib/predict";

const round: LiveRound = { eventId: "POLY-1", asset: "BTC", window: "5m", openTime: 0, closeTime: 300, marketId: "POLY-1-0", downMarketId: "POLY-1-1", upPrice: 0.85, downPrice: 0.16, volume: 0 };
const pos = (side: "up" | "down", marketId: string) => ({ side, marketId, contractsMicro: "1000000", valueMicro: null });

describe("who leads follows the market odds", () => {
  it("Sube at 85% vs Baja 16%: Sube position leads, Baja position trails (screenshot case)", () => {
    expect(positionLeading("up", positionOdds([round], pos("up", "POLY-1-0")))).toBe(true);
    expect(positionLeading("down", positionOdds([round], pos("down", "POLY-1-1")))).toBe(false);
  });
  it("Baja 70% vs Sube 34%: Baja position leads", () => {
    const r = { ...round, upPrice: 0.34, downPrice: 0.7 };
    expect(positionLeading("down", positionOdds([r], pos("down", "POLY-1-1")))).toBe(true);
  });
  it("no odds: no winner is claimed", () => {
    expect(positionLeading("up", positionOdds([], pos("up", "POLY-9-0")))).toBeNull();
  });
  it("round not listed: falls back to the position's own sell price (0.30 per contract trails)", () => {
    expect(positionLeading("up", positionOdds([], { ...pos("up", "POLY-9-0"), valueMicro: "300000" }))).toBe(false);
  });
});
