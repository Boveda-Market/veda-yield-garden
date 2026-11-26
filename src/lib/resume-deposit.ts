import { decimalToUnits, unitsToDecimal } from "@/lib/onboarding";

/** Remembers an unfinished vault deposit or Doble o Nada play while the person buys dollars at Coinbase, so it reopens on return. */
export const RESUME_KEY = "boveda:resume-deposit";
export const RESUME_PLAY_KEY = "boveda:resume-play";
export const RESUME_MAX_MS = 30 * 60_000;
/** Short-lived intent only, never a saved price, signature or authorization. */
export const DEPOSIT_RESUME_MAX_MS = RESUME_MAX_MS;
export const PENDING_DEPOSIT_KEY = "boveda:pending-deposit:v2";
/** Same cap as the deposit form ($5,000). */
export const RESUME_MAX_MICRO = 5_000_000_000n;
/** `baseline`: dollars (micro-USDC, as text) the wallet had before the purchase, so the flow waits for the NEW dollars. */
export type ResumeDeposit = { vaultId: string; amount: string; position?: string; migrate?: boolean; baseline?: string; at: number };
/** `roundId`: the round the play was picked on, so a closed round is flagged instead of silently moved. */
export type ResumePlay = { market: string; window: string; side: "up" | "down"; amount: string; roundId?: string; baseline?: string; at: number };

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const ls = (): Store => {
  try { return localStorage; } catch { return { getItem: () => null, setItem: () => {}, removeItem: () => {} }; }
};

function save(key: string, v: object, store: Pick<Storage, "setItem">, now: number) {
  try { store.setItem(key, JSON.stringify({ ...v, at: now })); } catch { /* storage blocked */ }
}
function clear(key: string, store: Pick<Storage, "removeItem">) {
  try { store.removeItem(key); } catch { /* ignore */ }
}
function peek<T extends { at: number }>(key: string, ok: (r: T) => boolean, store: Pick<Storage, "getItem" | "removeItem">, now: number, maxMs = RESUME_MAX_MS): T | null {
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const r = JSON.parse(raw) as T;
    if (!r || !Number.isFinite(r.at) || r.at > now || !ok(r) || now - r.at > maxMs) { clear(key, store); return null; }
    return r;
  } catch { clear(key, store); return null; }
}
const okBaseline = (b: unknown) => b === undefined || (typeof b === "string" && /^\d+$/.test(b));

export function saveResumeDeposit(r: Omit<ResumeDeposit, "at">, store: Pick<Storage, "setItem"> = ls(), now = Date.now()) { save(RESUME_KEY, r, store, now); }
export function clearResumeDeposit(store: Pick<Storage, "removeItem"> = ls()) { clear(RESUME_KEY, store); }
/** Reads without consuming; after 30 minutes the person starts a new quote. */
export function peekResumeDeposit(store: Pick<Storage, "getItem" | "removeItem"> = ls(), now = Date.now()): ResumeDeposit | null {
  return peek<ResumeDeposit>(RESUME_KEY, (r) => typeof r.vaultId === "string" && typeof r.amount === "string" && okBaseline(r.baseline), store, now, DEPOSIT_RESUME_MAX_MS);
}
export function savePendingDeposit(r: Pick<ResumeDeposit, "vaultId" | "amount">, store: Pick<Storage, "setItem"> = ls(), now = Date.now()) { save(PENDING_DEPOSIT_KEY, r, store, now); }
export function clearPendingDeposit(store: Pick<Storage, "removeItem"> = ls()) { clear(PENDING_DEPOSIT_KEY, store); }
export function peekPendingDeposit(store: Pick<Storage, "getItem" | "removeItem"> = ls(), now = Date.now()): ResumeDeposit | null {
  return peek<ResumeDeposit>(PENDING_DEPOSIT_KEY, (r) => typeof r.vaultId === "string" && typeof r.amount === "string" && /^\d+(\.\d{1,6})?$/.test(r.amount) && (decimalToUnits(r.amount, 6) ?? 0n) > 0n && (decimalToUnits(r.amount, 6) ?? 0n) <= RESUME_MAX_MICRO, store, now, DEPOSIT_RESUME_MAX_MS);
}
/** A saved visitor draft is not a session: reopen only after verified access and wallet readiness. */
export function peekSessionPendingDeposit(authenticated: boolean, wallet: string | null | undefined, store: Pick<Storage, "getItem" | "removeItem"> = ls(), now = Date.now()): ResumeDeposit | null {
  return authenticated && wallet ? peekPendingDeposit(store, now) : null;
}
/** Reads and clears the pending deposit. */
export function takeResumeDeposit(store: Pick<Storage, "getItem" | "removeItem"> = ls(), now = Date.now()): ResumeDeposit | null {
  const r = peekResumeDeposit(store, now);
  clearResumeDeposit(store);
  return r;
}

export function saveResumePlay(r: Omit<ResumePlay, "at">, store: Pick<Storage, "setItem"> = ls(), now = Date.now()) { save(RESUME_PLAY_KEY, r, store, now); }
export function clearResumePlay(store: Pick<Storage, "removeItem"> = ls()) { clear(RESUME_PLAY_KEY, store); }
export function peekResumePlay(store: Pick<Storage, "getItem" | "removeItem"> = ls(), now = Date.now()): ResumePlay | null {
  return peek<ResumePlay>(RESUME_PLAY_KEY, (r) => typeof r.market === "string" && typeof r.window === "string" && (r.side === "up" || r.side === "down") && typeof r.amount === "string" && okBaseline(r.baseline), store, now);
}

/** Play a visitor picked before signing in (this tab only, like the pending vault deposit): reopened as soon as the wallet is ready. */
export const PENDING_PLAY_KEY = "boveda:pending-play";
const ss = (): Store => sessionStorage;
export function savePendingPlay(r: Omit<ResumePlay, "at" | "baseline">, store: Pick<Storage, "setItem"> = ss(), now = Date.now()) { save(PENDING_PLAY_KEY, r, store, now); }
export function clearPendingPlay(store: Pick<Storage, "removeItem"> = ss()) { clear(PENDING_PLAY_KEY, store); }
export function peekPendingPlay(store: Pick<Storage, "getItem" | "removeItem"> = ss(), now = Date.now()): ResumePlay | null {
  return peek<ResumePlay>(PENDING_PLAY_KEY, (r) => typeof r.market === "string" && typeof r.window === "string" && (r.side === "up" || r.side === "down") && typeof r.amount === "string", store, now);
}

/** True once dollars beyond what the wallet held before the purchase have landed (no baseline recorded → any dollars). */
export function newFundsArrived(usdcMicro: bigint | undefined | null, baseline?: string): boolean {
  if (usdcMicro == null) return false;
  const before = baseline ? BigInt(baseline) : 0n;
  return usdcMicro > before;
}

/** Deposit amount on return: what the person chose, never more than the dollars available (nor $5,000); no amount chosen → all available dollars. */
export function fitResumeAmount(amount: string, usdcMicro: bigint): string {
  const cap = usdcMicro < RESUME_MAX_MICRO ? usdcMicro : RESUME_MAX_MICRO;
  const chosen = decimalToUnits(amount.replace(/,/g, "") || "0", 6);
  const micro = chosen != null && chosen > 0n && chosen < cap ? chosen : cap;
  return unitsToDecimal(micro, 6);
}

export type ResumeStep =
  | { kind: "none" }
  | { kind: "wait"; for: "play" | "deposit"; vaultId?: string }
  | { kind: "play" }
  | { kind: "deposit"; vaultId: string; amount: string; position?: string; migrate?: boolean };

/** What Billetera does on return from Coinbase: a pending play wins over a deposit; both wait until the new dollars land. */
export function resumeStep(play: ResumePlay | null, deposit: ResumeDeposit | null, usdcMicro: bigint | undefined): ResumeStep {
  if (play) return newFundsArrived(usdcMicro, play.baseline) ? { kind: "play" } : { kind: "wait", for: "play" };
  if (!deposit) return { kind: "none" };
  if (usdcMicro == null || !newFundsArrived(usdcMicro, deposit.baseline)) return { kind: "wait", for: "deposit", vaultId: deposit.vaultId };
  return { kind: "deposit", vaultId: deposit.vaultId, amount: fitResumeAmount(deposit.amount, usdcMicro), ...(deposit.position ? { position: deposit.position } : {}), ...(deposit.migrate ? { migrate: true } : {}) };
}
