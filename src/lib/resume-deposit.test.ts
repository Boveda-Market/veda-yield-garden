import { describe, expect, it } from "vitest";
import { fitResumeAmount, peekResumeDeposit, RESUME_KEY, saveResumeDeposit, takeResumeDeposit } from "./resume-deposit";

function memory() { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), has: (k: string) => m.has(k) }; }

describe("resume deposit (step 3 after topping up)", () => {
  it("peek keeps the pending deposit until the dollars arrive", () => {
    const s = memory(); saveResumeDeposit({ vaultId: "trump", amount: "20" }, s, 1000);
    expect(peekResumeDeposit(s, 2000)?.vaultId).toBe("trump");
    expect(s.has(RESUME_KEY)).toBe(true);
    expect(takeResumeDeposit(s, 2000)?.amount).toBe("20");
    expect(s.has(RESUME_KEY)).toBe(false);
  });
  it("expires after 30 minutes", () => {
    const s = memory(); saveResumeDeposit({ vaultId: "gta6", amount: "20" }, s, 0);
    expect(peekResumeDeposit(s, 30 * 60_000 + 1)).toBeNull();
  });
  it("never asks for more than the dollars that arrived", () => {
    expect(fitResumeAmount("20", 18_500_000n)).toBe("18.5");
    expect(fitResumeAmount("20", 25_000_000n)).toBe("20");
  });
  it("uses all arrived dollars when no amount was chosen, capped at $5,000", () => {
    expect(fitResumeAmount("", 30_000_000n)).toBe("30");
    expect(fitResumeAmount("", 9_000_000_000n)).toBe("5000");
  });
});
