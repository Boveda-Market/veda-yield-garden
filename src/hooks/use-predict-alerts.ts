import { useContext, useEffect, useMemo, useState } from "react";
import { BovedaSessionContext } from "@/hooks/use-boveda-session";
import { usePredictPositions } from "@/lib/predict-positions-query";
import { resolvedOutcome, type PredictOutcome } from "@/lib/predict-alerts";
import { notifyPredictResults } from "@/lib/telegram-alerts.functions";
import type { PredictPosition } from "@/lib/predict";

export type PredictAlert = { id: string; outcome: PredictOutcome; p: PredictPosition };
const SEEN = (w: string) => `boveda:predict-seen:${w}`;
const SENT = (w: string) => `boveda:predict-sent:${w}`;
const REG = (w: string) => `boveda:predict-reg:${w}`;
const read = (k: string): string[] => { try { const v = JSON.parse(localStorage.getItem(k) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(-300) : []; } catch { return []; } };
const write = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v.slice(-300))); } catch { /* ignore */ } };

/** Resolved Sube/Baja rounds for the bell (won = prize to claim, lost) and one-time Telegram alerts for new ones. */
export function usePredictAlerts() {
  const session = useContext(BovedaSessionContext);
  const wallet = session?.authenticated ? session.walletAddress : null;
  const q = usePredictPositions(wallet);
  const alerts = useMemo<PredictAlert[]>(() => (q.data ?? []).flatMap((p) => { const o = resolvedOutcome(p); return o ? [{ id: `predict:${p.pubkey}`, outcome: o, p }] : []; }), [q.data]);
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    if (!wallet) { setUnread(false); return; }
    const seen = read(SEEN(wallet));
    setUnread(alerts.some((a) => !seen.includes(a.id)));
    const sent = read(SENT(wallet));
    let fresh = alerts.filter((a) => !sent.includes(a.p.pubkey)).map((a) => a.p.pubkey).slice(0, 20);
    // Register the wallet once (any position works) so closed-app alerts reach Telegram.
    const reg = (() => { try { return localStorage.getItem(REG(wallet)) === "1"; } catch { return true; } })();
    if (fresh.length === 0 && !reg && (q.data ?? []).length) fresh = [(q.data ?? [])[0]!.pubkey];
    if (fresh.length === 0 || !session?.getAccessToken) return;
    void (async () => {
      const token = await session.getAccessToken?.().catch(() => null);
      if (!token) return;
      const r = await notifyPredictResults({ data: { token, wallet, positions: fresh } }).catch(() => null);
      if (r?.success) { write(SENT(wallet), [...sent, ...fresh.filter((f) => alerts.some((a) => a.p.pubkey === f))]); try { localStorage.setItem(REG(wallet), "1"); } catch { /* ignore */ } }
    })();
  }, [alerts, wallet, session, q.data]);
  const markSeen = () => { if (wallet) { write(SEEN(wallet), [...new Set([...read(SEEN(wallet)), ...alerts.map((a) => a.id)])]); setUnread(false); } };
  return { alerts, unread, markSeen };
}
