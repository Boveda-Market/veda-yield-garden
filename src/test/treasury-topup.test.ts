import { describe, expect, it } from "vitest";
import { decideTopup } from "@/lib/treasury-topup";

const base = { sol: 4_000_000n, usdcMicro: 12_000_000n, pendingMicro: 0n, lastAt: null, now: 1e12 };
describe("treasury self-refill", () => {
  it("swaps $10 when below 0.015 SOL with $10 free", () => expect(decideTopup(base)).toEqual({ kind: "swap", amountMicro: 10_000_000n }));
  it("does nothing at or above 0.015 SOL", () => expect(decideTopup({ ...base, sol: 15_000_000n })).toEqual({ kind: "skip", reason: "healthy" }));
  it("waits 4 hours between automatic refills", () => {
    expect(decideTopup({ ...base, lastAt: base.now - 3 * 3600_000 })).toEqual({ kind: "skip", reason: "cooldown" });
    expect(decideTopup({ ...base, lastAt: base.now - 4 * 3600_000 }).kind).toBe("swap");
  });
  it("never spends pending affiliate commissions", () => {
    expect(decideTopup({ ...base, pendingMicro: 4_000_000n })).toEqual({ kind: "swap", amountMicro: 5_000_000n });
    expect(decideTopup({ ...base, pendingMicro: 8_000_000n })).toEqual({ kind: "skip", reason: "no-dollars" });
  });
  it("cannot swap below 0.0025 SOL", () => expect(decideTopup({ ...base, sol: 2_000_000n })).toEqual({ kind: "skip", reason: "no-sol" }));
  it("manual ignores threshold and cooldown", () => expect(decideTopup({ ...base, sol: 50_000_000n, lastAt: base.now, manual: true }).kind).toBe("swap"));
});
