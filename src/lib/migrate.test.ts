import { describe, it, expect } from "vitest";
import { bestUpgrade, breakEvenDays } from "./migrate";

describe("migrate", () => {
  it("suggests a vault at least 5 points higher", () => expect(bestUpgrade("sol", { sol: 18, met: 34 })).toEqual({ id: "met", apr: 34, gain: 16 }));
  it("does not suggest under 5 points", () => expect(bestUpgrade("sol", { sol: 18, met: 22.9 })).toBeNull());
  it("ignores unknown rates", () => expect(bestUpgrade("sol", { sol: null, met: 50 })).toBeNull());
  it("break-even for 2% fees at +16 APR", () => expect(breakEvenDays(16)).toBe(46));
});
