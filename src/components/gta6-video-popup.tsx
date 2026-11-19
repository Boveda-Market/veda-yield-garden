import { useEffect, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight, Crown, Flame } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS, type Vault } from "@/lib/vaults";
import { isDlmmVault, isOperableVault, type ChainPosition, type OperableVault } from "@/lib/solana-data";
import { poolYieldOptions } from "@/lib/pool-yield";
import { useRealWallet } from "@/hooks/use-real-wallet";
import { Dialog, DialogDescription, DialogTitle } from "./ui/dialog";
import { ActionSheetContent } from "./ui/action-sheet";
import { DepositSimulation } from "./deposit-simulation";
import { WithdrawalSimulation } from "./withdrawal-simulation";
import { DctySkyline, VaultTitle, vaultSkin } from "./vault-skin";
import { Sunset } from "./hot-vault-card";
import { gta6Candidate } from "./gta6-promo";
import { RANK_ACKED } from "@/lib/rank-ack";

const gta6 = VAULTS.find((v) => v.id === "gta6");
const HOT = VAULTS.filter((v) => v.badge && isDlmmVault(v.id));
const VISITS = "boveda:gta6-video-visits";
const HOOK: Record<string, string> = {
  dcty: "La moneda que viste en el juego GTA 6",
  gta6: "La bóveda insignia · Zona ultra concentrada",
};

/** No dollars yet: every Mi Billetera visit. Dollars but no vaults: visits 1, 4, 7… (once every 3). */
export function gta6VideoDue(hasDollars: boolean, visit: number): boolean {
  return !hasDollars || (visit - 1) % 3 === 0;
}

/** Popup: wallets without a GTA6 position; holders of a movable vault get the migrate popup instead. */
export function showGta6Video(positions: ChainPosition[]): boolean {
  return !!gta6 && !positions.some((p) => p.vaultId === gta6.id) && !gta6Candidate(positions);
}

/** Launch date (UTC ms) of each high-octane vault; announcements fade out over 3 weeks after it. */
export const LAUNCH: Record<string, number> = { dcty: Date.UTC(2026, 10, 19) };
const DAY = 24 * 3600_000;
/** Week 1: every 2 days; week 2: every 4 days; week 3: once; after 21 days: never. */
export function campaignGap(launch: number | undefined, now: number): number | null {
  if (launch == null) return null;
  const age = now - launch;
  if (age < 0 || age >= 21 * DAY) return null;
  return age < 7 * DAY ? 2 * DAY : age < 14 * DAY ? 4 * DAY : 7 * DAY;
}
/** Kept for compatibility: the widest gap used by the campaign. */
export const HOLDER_GAP_MS = 7 * DAY;
/** Holders: only for a missing vault still in its launch campaign, and never after they moved vaults for this lineup. */
export function holderRankDue(positions: ChainPosition[], lastShown: number | null, now: number, acked: string[] = []): boolean {
  if (!positions.length || gta6Candidate(positions)) return false;
  if (HOT.every((v) => acked.includes(v.id))) return false;
  const gaps = HOT.filter((v) => !positions.some((p) => p.vaultId === v.id)).map((v) => campaignGap(LAUNCH[v.id], now)).filter((g): g is number => g != null);
  if (!gaps.length) return false;
  return lastShown == null || now - lastShown >= Math.min(...gaps);
}
const HOLDER_SEEN = "boveda:rank-holder-seen";
/** Dollars below which the card suggests moving funds instead of depositing new ones. */
export const MOVE_SUGGEST_USD = 5;
/** Another unlocked vault the user could move from into the target. */
export function moveSource(positions: ChainPosition[], targetId: string): ChainPosition | null {
  return positions.filter((p) => p.vaultId !== targetId && !p.locked && isOperableVault(p.vaultId)).sort((a, b) => Number(b.usdcAmount ?? 0) - Number(a.usdcAmount ?? 0))[0] ?? null;
}

/** Order high-octane vaults by live APR (unknown last). */
export function rankByApr<T extends { apr: number | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.apr ?? -1) - (a.apr ?? -1));
}

/** Live ranking of high-octane vaults, compact enough to fit one phone screen. */
export function HotRankCard({ onEnter, onLater, positions = [], usdc = 0, onMove }: { onEnter: (v: Vault) => void; onLater: () => void; positions?: ChainPosition[]; usdc?: number; onMove?: (from: ChainPosition, to: Vault) => void }) {
  const t = useT();
  const qs = useQueries({ queries: HOT.map((v) => poolYieldOptions(v.pool)) });
  const rows = rankByApr(HOT.map((vault, i) => ({ vault, apr: qs[i]?.data?.apr ?? null })));
  return <>
    <div className="flex items-center gap-2 pr-10">
      <span className="hot-cta inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-hot-surface"><Flame size={12} aria-hidden />{t("Alto octanaje")}</span>
      <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live motion-reduce:animate-none" />{t("En vivo")}</span>
    </div>
    <DialogTitle className="mt-2 font-display text-lg font-black leading-tight">{t("Bóvedas que más rinden hoy")}</DialogTitle>
    <DialogDescription className="sr-only">{t("Bóvedas de alto octanaje ordenadas por rendimiento")}</DialogDescription>
    <div className="mt-3 space-y-2.5">
      {rows.map(({ vault, apr }, i) => { const owned = positions.some((p) => p.vaultId === vault.id); const src = !owned && onMove ? moveSource(positions, vault.id) : null; const moveFirst = !!src && usdc < MOVE_SUGGEST_USD; return <div key={vault.id}><button type="button" onClick={() => (moveFirst && src ? onMove?.(src, vault) : onEnter(vault))} className={`hot-ring block w-full rounded-2xl p-[2px] text-left shadow-[var(--shadow-hot)] transition-transform active:scale-[0.98] ${vaultSkin(vault.id)}`}>
        <span className="relative isolate block overflow-hidden rounded-[calc(1rem-2px)] bg-[image:var(--gradient-hot)] px-3 py-2.5 text-hot-foreground">
          {vault.id === "dcty" ? <DctySkyline /> : <Sunset />}
          <span className="relative flex items-center justify-between gap-2">
            <VaultTitle vault={vault} className="h-6" />
            <span className="flex items-center gap-1">{owned && <span className="rounded-full bg-hot-surface px-2 py-0.5 text-[10px] font-bold">{t("Tu bóveda activa")}</span>}{i === 0 && <span className="flex items-center gap-1 rounded-full bg-hot-surface px-2 py-0.5 text-[10px] font-black uppercase"><Crown size={11} aria-hidden />#1</span>}</span>
          </span>
          <span className="relative mt-1.5 inline-block rounded-lg bg-hot-surface/70 px-2 py-0.5 text-[12.5px] font-bold leading-snug text-hot-foreground shadow-sm backdrop-blur-[2px]">{t(HOOK[vault.id] ?? vault.pair)}</span>
          <span className="relative mt-1.5 flex items-end justify-between gap-2">
            <span><span className="block font-display text-2xl font-black leading-none tabular-nums">{apr == null ? "—" : `${apr.toLocaleString("es-MX", { maximumFractionDigits: 0 })}%`}</span><span className="text-[10px] font-medium opacity-80">{t("APR estimado · 24 h")}</span></span>
            <span className="flex items-center gap-1 rounded-xl bg-hot-surface px-3 py-2 text-xs font-black">{moveFirst ? t("Mover capital ⇄") : owned ? t("Añadir") : t("Depositar")}{!moveFirst && <ArrowRight size={14} aria-hidden />}</span>
          </span>
        </span>
      </button>{src && !moveFirst && <button type="button" onClick={() => onMove?.(src, vault)} className="mt-0.5 min-h-9 w-full text-center text-xs font-semibold text-muted-foreground underline underline-offset-2">{t("o mover desde otra bóveda")}</button>}</div>; })}
    </div>
    <p className="mt-2.5 text-center text-[11px] text-muted-foreground">⚡ {t("Ambas con Piloto Automático: trabajan en la zona activa y se rebalancean solas 24/7.")}</p>
    <button type="button" onClick={onLater} className="mt-1 min-h-11 w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline">{t("Ver más tarde")}</button>
  </>;
}

/** Ranking popup in Mi Billetera: no vault = every visit without dollars / every 3rd with dollars; vault holders = weekly while a high-octane vault is missing. */
export function Gta6VideoPopup({ wallet }: { wallet: string | null | undefined }) {
  const q = useRealWallet(wallet ?? null);
  const ready = !!wallet && !!q.data?.success;
  const positions = q.data?.success ? q.data.data.positions : [];
  const newcomer = ready && showGta6Video(positions) && positions.length === 0;
  const [open, setOpen] = useState(false);
  const [deposit, setDeposit] = useState<{ vault: Vault; amount?: string; migrate?: boolean } | null>(null);
  const [withdrawal, setWithdrawal] = useState<{ position: string; vaultId: OperableVault; migrateTo: Vault } | null>(null);
  const decided = useRef(false);
  const usdc = q.data?.success ? Number(q.data.data.usdc) || 0 : 0;
  const hasDollars = q.data?.success ? Number(q.data.data.usdc) > 0 : false;
  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    if (newcomer) {
      let visit = 1;
      if (hasDollars) { try { visit = Number(localStorage.getItem(VISITS) || 0) + 1; localStorage.setItem(VISITS, String(visit)); } catch { /* show anyway */ } }
      if (gta6VideoDue(hasDollars, visit)) setOpen(true);
      return;
    }
    let last: number | null = null;
    try { const v = localStorage.getItem(HOLDER_SEEN); last = v ? Number(v) : null; } catch { return; }
    let acked: string[] = [];
    try { acked = JSON.parse(localStorage.getItem(RANK_ACKED) || "[]"); } catch { /* none */ }
    if (holderRankDue(positions, last, Date.now(), acked)) { try { localStorage.setItem(HOLDER_SEEN, String(Date.now())); } catch { /* ignore */ } setOpen(true); }
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!gta6) return null;
  return <>
    <Dialog open={open} onOpenChange={setOpen}>
      <ActionSheetContent><HotRankCard positions={positions} usdc={usdc} onEnter={(v) => { setOpen(false); setDeposit({ vault: v }); }} onMove={(from, to) => { if (!isOperableVault(from.vaultId)) return; setOpen(false); setWithdrawal({ position: from.address, vaultId: from.vaultId, migrateTo: to }); }} onLater={() => setOpen(false)} /></ActionSheetContent>
    </Dialog>
    {wallet && withdrawal && <WithdrawalSimulation wallet={wallet} {...withdrawal} onClose={() => { setWithdrawal(null); void q.refetch(); }} onMigrated={(amount, target) => { setWithdrawal(null); setDeposit({ vault: target, amount, migrate: true }); }} />}
    {deposit && <DepositSimulation vault={deposit.vault} wallet={wallet ?? null} initialAmount={deposit.amount ?? ""} migrate={Boolean(deposit.migrate)} onClose={() => { setDeposit(null); void q.refetch(); }} />}
  </>;
}
