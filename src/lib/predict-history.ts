import { positionWon, type PredictPosition } from "@/lib/predict";

/** One prediction kept in this browser's history, so resolved/claimed rounds don't disappear when the venue stops listing them. */
export type PredictRecord = PredictPosition & { seenAt: number; soldMicro?: string; claimSig?: string; sellSig?: string; gone?: boolean };
export type PredictState = "open" | "won" | "lost" | "sold" | "closed";

export const historyKey = (wallet: string) => `boveda:predict-history:${wallet}`;
const MAX = 300;

export function readHistory(raw: string | null): PredictRecord[] {
  try { const v = JSON.parse(raw ?? "[]"); return Array.isArray(v) ? v.filter((r) => r && typeof r.pubkey === "string" && typeof r.costMicro === "string").slice(0, MAX) : []; } catch { return []; }
}

/** Merge live positions into stored records: live data wins; records the venue no longer lists stay, marked gone. */
export function mergeHistory(prev: PredictRecord[], live: PredictPosition[], now: number): PredictRecord[] {
  const map = new Map(prev.map((r) => [r.pubkey, { ...r, gone: true }]));
  for (const p of live) { const old = map.get(p.pubkey); map.set(p.pubkey, { ...old, ...p, seenAt: old?.seenAt ?? now, gone: false }); }
  return [...map.values()].sort((a, b) => (b.closeTime ?? b.seenAt / 1000) - (a.closeTime ?? a.seenAt / 1000)).slice(0, MAX);
}

export function recordState(r: PredictRecord, nowSec: number): PredictState {
  if (r.soldMicro) return "sold";
  const won = positionWon(r);
  if (won !== null) return won ? "won" : "lost";
  if (r.status === "open" && !(r.gone && r.closeTime && r.closeTime < nowSec)) return "open";
  return "closed";
}

/** Net USDC returned to the wallet (micro): payout if won, sale value if sold, 0 if lost, null while open/unknown. */
export function netDeposit(r: PredictRecord, nowSec: number): bigint | null {
  const s = recordState(r, nowSec);
  if (s === "sold") return BigInt(r.soldMicro!);
  if (s === "won") return BigInt(r.payoutMicro || "0");
  if (s === "lost") return 0n;
  return null;
}

export function historyTotals(rows: PredictRecord[], nowSec: number) {
  let invested = 0n, returned = 0n, pnl = 0n, won = 0, lost = 0;
  for (const r of rows) {
    const d = netDeposit(r, nowSec); if (d === null) continue;
    const c = BigInt(r.costMicro || "0"); invested += c; returned += d; pnl += d - c;
    if (d > c) won++; else lost++;
  }
  return { invested, returned, pnl, won, lost };
}

/** Browser-only: annotate a stored record after a sale or claim signed in this app. */
export function annotateRecord(wallet: string, pubkey: string, patch: Partial<PredictRecord>) {
  try { const k = historyKey(wallet); const rows = readHistory(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(rows.map((r) => r.pubkey === pubkey ? { ...r, ...patch } : r))); } catch {}
}
