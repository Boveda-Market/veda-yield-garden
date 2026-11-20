/** Remembers an unfinished vault deposit while the person buys dollars at Coinbase, so it reopens on return. */
export const RESUME_KEY = "boveda:resume-deposit";
export const RESUME_MAX_MS = 30 * 60_000;
export type ResumeDeposit = { vaultId: string; amount: string; position?: string; migrate?: boolean; at: number };

export function saveResumeDeposit(r: Omit<ResumeDeposit, "at">, store: Pick<Storage, "setItem"> = localStorage, now = Date.now()) {
  try { store.setItem(RESUME_KEY, JSON.stringify({ ...r, at: now })); } catch { /* storage blocked */ }
}
export function clearResumeDeposit(store: Pick<Storage, "removeItem"> = localStorage) {
  try { store.removeItem(RESUME_KEY); } catch { /* ignore */ }
}
/** Reads and clears the pending deposit; stale (>30 min) or malformed entries are dropped. */
export function takeResumeDeposit(store: Pick<Storage, "getItem" | "removeItem"> = localStorage, now = Date.now()): ResumeDeposit | null {
  try {
    const raw = store.getItem(RESUME_KEY); store.removeItem(RESUME_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as ResumeDeposit;
    if (typeof r?.vaultId !== "string" || typeof r.amount !== "string" || typeof r.at !== "number" || now - r.at > RESUME_MAX_MS) return null;
    return r;
  } catch { return null; }
}
