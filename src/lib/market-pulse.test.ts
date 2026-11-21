import { describe, it, expect } from "vitest";
import { marketPulse } from "./market-pulse";
const s = (b: number, v: number, c1: number, c24: number) => ({ buys24h: b, sells24h: v, change1h: c1, change24h: c24 });
describe("marketPulse", () => {
  it("bull run when buys over 60% and price up over 5% in 24h", () => expect(marketPulse(s(65, 35, 0, 6))).toBe("bull"));
  it("bull run when buys over 60% and up over 2% in 1h", () => expect(marketPulse(s(65, 35, 3, 1))).toBe("bull"));
  it("moderate when balanced and stable", () => expect(marketPulse(s(52, 48, 0.5, 2))).toBe("moderate"));
  it("volatile when price drops over 5%", () => expect(marketPulse(s(65, 35, 0, -6))).toBe("volatile"));
  it("volatile when moves over 15%", () => expect(marketPulse(s(70, 30, 0, 20))).toBe("volatile"));
  it("volatile when sells dominate", () => expect(marketPulse(s(40, 60, 0, 1))).toBe("volatile"));
  it("unknown without data", () => expect(marketPulse(null)).toBeNull());
});
