import { describe, expect, it } from "vitest";
import { saveResumeDeposit, takeResumeDeposit } from "@/lib/resume-deposit";
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
describe("resume deposit after Coinbase", () => {
  it("reopens the same vault, amount and move once", () => { const s = mem(); saveResumeDeposit({ vaultId: "gta6", amount: "25", migrate: true }, s, 0); expect(takeResumeDeposit(s, 60_000)).toMatchObject({ vaultId: "gta6", amount: "25", migrate: true }); expect(takeResumeDeposit(s, 60_000)).toBeNull(); });
  it("drops it after 30 minutes", () => { const s = mem(); saveResumeDeposit({ vaultId: "gta6", amount: "25" }, s, 0); expect(takeResumeDeposit(s, 31 * 60_000)).toBeNull(); });
});

import { clearPendingPlay, peekPendingPlay, savePendingPlay } from "@/lib/resume-deposit";
describe("Doble o Nada antes de iniciar sesión", () => {
  const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };
  it("recuerda moneda, duración, lado y monto para reabrir la jugada al entrar", () => {
    const s = mem();
    savePendingPlay({ market: "BTC", window: "5m", side: "up", amount: "10" }, s, 0);
    expect(peekPendingPlay(s, 60_000)).toMatchObject({ market: "BTC", window: "5m", side: "up", amount: "10" });
    clearPendingPlay(s);
    expect(peekPendingPlay(s, 60_000)).toBeNull();
  });
  it("olvida la jugada después de 30 minutos", () => {
    const s = mem();
    savePendingPlay({ market: "ETH", window: "15m", side: "down", amount: "5" }, s, 0);
    expect(peekPendingPlay(s, 31 * 60_000)).toBeNull();
  });
});
