import { useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BovedaSessionContext } from "@/hooks/use-boveda-session";
import { useRealWallet } from "@/hooks/use-real-wallet";
import { rangeAlertTimes } from "@/lib/rebalance.functions";
import { registerAlertWallet } from "@/lib/telegram-alerts.functions";
import { RANGE_ALERT_MS } from "@/lib/dlmm";
import { isDlmmVault, type ChainPosition } from "@/lib/solana-data";

export type RangeAlert = { id: string; p: ChainPosition; since: number };
const FIRST = (w: string) => `boveda:range-first:${w}`;
const REG = (w: string) => `boveda:range-reg:${w}`;
const readFirst = (w: string): Record<string, number> => { try { const v = JSON.parse(localStorage.getItem(FIRST(w)) ?? "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; } };

/** Earliest out-of-range time: the background job's record or this browser's first sighting. */
export function rangeSince(server: string | undefined, local: number | undefined): number | null {
  const s = server ? Date.parse(server) : NaN;
  const all = [Number.isFinite(s) ? s : null, local ?? null].filter((x): x is number => x !== null);
  return all.length ? Math.min(...all) : null;
}

/** Bell items for range-vault positions out of range for 10+ minutes (rebalance with one tap). */
export function useRangeAlerts() {
  const session = useContext(BovedaSessionContext);
  const wallet = session?.authenticated ? session.walletAddress : null;
  const q = useRealWallet(wallet);
  const out = useMemo(() => (q.data?.success ? q.data.data.positions : []).filter((p) => p.outOfRange && isDlmmVault(p.vaultId)), [q.data]);
  const times = useServerFn(rangeAlertTimes);
  const server = useQuery({ queryKey: ["range-alert-times", out.map((p) => p.address).join(",")], queryFn: () => times({ data: { positions: out.map((p) => p.address).slice(0, 20) } }), enabled: out.length > 0, staleTime: 60_000 });
  const [now, setNow] = useState(() => Date.now());
  const [first, setFirst] = useState<Record<string, number>>({});
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(id); }, []);
  useEffect(() => {
    if (!wallet) return;
    const prev = readFirst(wallet), next: Record<string, number> = {};
    for (const p of out) next[p.address] = prev[p.address] ?? Date.now();
    try { localStorage.setItem(FIRST(wallet), JSON.stringify(next)); } catch { /* ignore */ }
    setFirst(next);
  }, [wallet, out]);
  // Register the wallet once so out-of-range alerts reach Telegram even while the app is closed.
  useEffect(() => {
    if (!wallet || !session?.getAccessToken || (q.data?.success ? q.data.data.positions : []).every((p) => !isDlmmVault(p.vaultId))) return;
    try { if (localStorage.getItem(REG(wallet)) === "1") return; } catch { return; }
    void (async () => {
      const token = await session.getAccessToken?.().catch(() => null);
      if (!token) return;
      const r = await registerAlertWallet({ data: { token, wallet } }).catch(() => null);
      if (r?.success) try { localStorage.setItem(REG(wallet), "1"); } catch { /* ignore */ }
    })();
  }, [wallet, session, q.data]);
  const alerts = useMemo<RangeAlert[]>(() => out.flatMap((p) => {
    const since = rangeSince(server.data?.[p.address], first[p.address]);
    return since !== null && now - since >= RANGE_ALERT_MS ? [{ id: `range:${p.address}:${since}`, p, since }] : [];
  }), [out, server.data, first, now]);
  return alerts;
}
