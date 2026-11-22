import { decimalToUnits, unitsToDecimal } from "@/lib/onboarding";

/** Remembers an unfinished vault deposit while the person buys dollars at Coinbase, so it reopens on return. */
export const RESUME_KEY = "boveda:resume-deposit";
export const RESUME_MAX_MS = 30 * 60_000;
/** Same cap as the deposit form ($5,000). */
export const RESUME_MAX_MICRO = 5_000_000_000n;
export type ResumeDeposit = { vaultId: string; amount: string; position?: string; migrate?: boolean; at: number };

export function saveResumeDeposit(r: Omit<ResumeDeposit, "at">, store: Pick<Storage, "setItem"> = localStorage, now = Date.now()) {
  try { store.setItem(RESUME_KEY, JSON.stringify({ ...r, at: now })); } catch { /* storage blocked */ }
}
export function clearResumeDeposit(store: Pick<Storage, "removeItem"> = localStorage) {
  try { store.removeItem(RESUME_KEY); } catch { /* ignore */ }
}
/** Reads the pending deposit without clearing it; stale (>30 min) or malformed entries read as none. */
export function peekResumeDeposit(store: Pick<Storage, "getItem"> = localStorage, now = Date.now()): ResumeDeposit | null {
  try {
    const raw = store.getItem(RESUME_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as ResumeDeposit;
    if (typeof r?.vaultId !== "string" || typeof r.amount !== "string" || typeof r.at !== "number" || now - r.at > RESUME_MAX_MS) return null;
    return r;
  } catch { return null; }
}
/** Reads and clears the pending deposit. */
export function takeResumeDeposit(store: Pick<Storage, "getItem" | "removeItem"> = localStorage, now = Date.now()): ResumeDeposit | null {
  const r = peekResumeDeposit(store, now);
  clearResumeDeposit(store);
  return r;
}
/** Step 3 amount: what the person chose, never more than the dollars that actually arrived (nor $5,000); no amount chosen → all arrived dollars. */
export function fitResumeAmount(amount: string, usdcMicro: bigint): string {
  const cap = usdcMicro < RESUME_MAX_MICRO ? usdcMicro : RESUME_MAX_MICRO;
  const chosen = decimalToUnits(amount.replace(/,/g, "") || "0", 6);
  const micro = chosen != null && chosen > 0n && chosen < cap ? chosen : cap;
  return unitsToDecimal(micro, 6);
}
