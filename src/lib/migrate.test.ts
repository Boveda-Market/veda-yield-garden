import { describe, it, expect } from "vitest";
import { bestUpgrade, breakEvenDays, gapAlertDue } from "./migrate";

describe("migrate", () => {
  it("suggests a vault at least 5 points higher", () => expect(bestUpgrade("sol", { sol: 18, met: 34 })).toEqual({ id: "met", apr: 34, gain: 16 }));
  it("does not suggest under 5 points", () => expect(bestUpgrade("sol", { sol: 18, met: 22.9 })).toBeNull());
  it("ignores unknown rates", () => expect(bestUpgrade("sol", { sol: null, met: 50 })).toBeNull());
  it("a 3% move pays off in 69 days at a 16-point APR gain", () => expect(breakEvenDays(16)).toBe(69));
});

import { withdrawalAmounts } from "@/lib/withdrawal";
describe("voluntary vault change fee", () => {
  it("charges the VIP 1% move fee on any $10,000 move and 0.40% VIP on a normal exit", () => {
    expect(withdrawalAmounts(10_000_000_000n, "rotate").fee).toBe(100_000_000n);
    expect(withdrawalAmounts(10_000_000_000n, true).fee).toBe(100_000_000n);
    expect(withdrawalAmounts(10_000_000_000n).fee).toBe(40_000_000n);
  });
  it("posts the gap alert at most once per 24h", () => {
    const now = Date.parse("2026-11-13T12:00:00Z");
    expect(gapAlertDue(null, now)).toBe(true);
    expect(gapAlertDue("2026-11-13T00:00:00Z", now)).toBe(false);
    expect(gapAlertDue("2026-11-12T12:00:00Z", now)).toBe(true);
  });
});
