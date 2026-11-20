import { describe, expect, it } from "vitest";
import { saveResumeDeposit, takeResumeDeposit } from "@/lib/resume-deposit";
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
describe("resume deposit after Coinbase", () => {
  it("reopens the same vault, amount and move once", () => { const s = mem(); saveResumeDeposit({ vaultId: "gta6", amount: "25", migrate: true }, s, 0); expect(takeResumeDeposit(s, 60_000)).toMatchObject({ vaultId: "gta6", amount: "25", migrate: true }); expect(takeResumeDeposit(s, 60_000)).toBeNull(); });
  it("drops it after 30 minutes", () => { const s = mem(); saveResumeDeposit({ vaultId: "gta6", amount: "25" }, s, 0); expect(takeResumeDeposit(s, 31 * 60_000)).toBeNull(); });
});
