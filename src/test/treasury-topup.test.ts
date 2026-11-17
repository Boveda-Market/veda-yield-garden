import { describe, expect, it } from "vitest";
import { decideTopup } from "@/lib/treasury-topup";

const base = { sol: 100_000_000n, usdcMicro: 60_000_000n, pendingMicro: 0n, lastAt: null, now: 1e12 };
describe("treasury self-refill", () => {
  it("does nothing at or above 0.15 SOL", () => expect(decideTopup({ ...base, sol: 150_000_000n })).toEqual({ kind: "skip", reason: "healthy" }));
  it("buys $30 with $50+ free", () => expect(decideTopup(base)).toEqual({ kind: "swap", amountMicro: 30_000_000n }));
  it("buys $15 with $25+ free", () => expect(decideTopup({ ...base, usdcMicro: 35_000_000n })).toEqual({ kind: "swap", amountMicro: 15_000_000n }));
  it("buys $10 with $15+ free", () => expect(decideTopup({ ...base, usdcMicro: 25_000_000n })).toEqual({ kind: "swap", amountMicro: 10_000_000n }));
  it("never spends pending affiliate commissions or the $10 cushion", () => {
    expect(decideTopup({ ...base, usdcMicro: 60_000_000n, pendingMicro: 36_000_000n })).toEqual({ kind: "skip", reason: "no-dollars" });
    expect(decideTopup({ ...base, usdcMicro: 24_999_999n })).toEqual({ kind: "skip", reason: "no-dollars" });
  });
  it("waits 15 minutes between refills", () => {
    expect(decideTopup({ ...base, lastAt: base.now - 14 * 60_000 })).toEqual({ kind: "skip", reason: "cooldown" });
    expect(decideTopup({ ...base, lastAt: base.now - 15 * 60_000 }).kind).toBe("swap");
  });
  it("cannot swap below 0.0025 SOL", () => expect(decideTopup({ ...base, sol: 2_000_000n })).toEqual({ kind: "skip", reason: "no-sol" }));
  it("manual ignores threshold and cooldown", () => expect(decideTopup({ ...base, sol: 500_000_000n, lastAt: base.now, manual: true }).kind).toBe("swap"));
});
