import { describe, expect, it } from "vitest";
import { resumeStep, clearResumePlay, fitResumeAmount, newFundsArrived, peekResumeDeposit, peekResumePlay, RESUME_KEY, RESUME_PLAY_KEY, saveResumeDeposit, saveResumePlay, takeResumeDeposit } from "./resume-deposit";

function memory() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), has: (k: string) => m.has(k) }; }

describe("resume after topping up", () => {
  it("peek keeps the pending deposit until the dollars arrive", () => {
    const s = memory(); saveResumeDeposit({ vaultId: "trump", amount: "20" }, s, 1000);
    expect(peekResumeDeposit(s, 2000)?.vaultId).toBe("trump");
    expect(s.has(RESUME_KEY)).toBe(true);
    expect(takeResumeDeposit(s, 2000)?.amount).toBe("20");
    expect(s.has(RESUME_KEY)).toBe(false);
  });
  it("expires after 30 minutes and removes the stale entry", () => {
    const s = memory(); saveResumeDeposit({ vaultId: "gta6", amount: "20" }, s, 0);
    expect(peekResumeDeposit(s, 30 * 60_000 + 1)).toBeNull();
    expect(s.has(RESUME_KEY)).toBe(false);
  });
  it("waits for the NEW dollars when the wallet already had some ($3 before)", () => {
    expect(newFundsArrived(3_000_000n, "3000000")).toBe(false);
    expect(newFundsArrived(20_000_000n, "3000000")).toBe(true);
    expect(newFundsArrived(undefined, "0")).toBe(false);
    expect(newFundsArrived(1n)).toBe(true);
  });
  it("never asks for more than the dollars available", () => {
    expect(fitResumeAmount("20", 18_500_000n)).toBe("18.5");
    expect(fitResumeAmount("20", 25_000_000n)).toBe("20");
  });
  it("uses all available dollars when no amount was chosen, capped at $5,000", () => {
    expect(fitResumeAmount("", 30_000_000n)).toBe("30");
    expect(fitResumeAmount("", 9_000_000_000n)).toBe("5000");
  });
  it("remembers the Doble o Nada play (coin, duration, side, amount) for 30 minutes", () => {
    const s = memory(); saveResumePlay({ market: "BTC", window: "5m", side: "down", amount: "5", baseline: "0" }, s, 0);
    expect(peekResumePlay(s, 60_000)).toMatchObject({ market: "BTC", window: "5m", side: "down", amount: "5" });
    expect(peekResumePlay(s, 30 * 60_000 + 1)).toBeNull();
    saveResumePlay({ market: "BTC", window: "5m", side: "up", amount: "5" }, s, 0);
    clearResumePlay(s);
    expect(s.has(RESUME_PLAY_KEY)).toBe(false);
  });

  describe("flow on return to Billetera", () => {
    const dep = { vaultId: "trump", amount: "20", baseline: "3000000", at: 0 };
    const play = { market: "BTC", window: "5m", side: "up" as const, amount: "5", baseline: "0", at: 0 };
    it("had $3, wants to deposit $20: keeps waiting while only the old $3 is there", () => {
      expect(resumeStep(null, dep, 3_000_000n)).toEqual({ kind: "wait", for: "deposit", vaultId: "trump" });
    });
    it("$17 arrive (total $20): opens the normal deposit card with $20", () => {
      expect(resumeStep(null, dep, 20_000_000n)).toEqual({ kind: "deposit", vaultId: "trump", amount: "20" });
    });
    it("less arrived than planned (total $15): deposit card opens with $15", () => {
      expect(resumeStep(null, dep, 15_000_000n)).toMatchObject({ kind: "deposit", amount: "15" });
    });
    it("Doble o Nada play waits for the dollars, then goes back to the play", () => {
      expect(resumeStep(play, null, 0n)).toEqual({ kind: "wait", for: "play" });
      expect(resumeStep(play, null, 11_400_000n)).toEqual({ kind: "play" });
    });
    it("nothing pending: Billetera shows nothing extra", () => {
      expect(resumeStep(null, null, 50_000_000n)).toEqual({ kind: "none" });
    });
  });
});
