import { useEffect, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight, Crown, Flame } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS, type Vault } from "@/lib/vaults";
import { isDlmmVault, type ChainPosition } from "@/lib/solana-data";
import { poolYieldOptions } from "@/lib/pool-yield";
import { useRealWallet } from "@/hooks/use-real-wallet";
import { Dialog, DialogDescription, DialogTitle } from "./ui/dialog";
import { ActionSheetContent } from "./ui/action-sheet";
import { DepositSimulation } from "./deposit-simulation";
import { DctySkyline, VaultTitle, vaultSkin } from "./vault-skin";
import { Sunset } from "./hot-vault-card";
import { gta6Candidate } from "./gta6-promo";

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

/** Order high-octane vaults by live APR (unknown last). */
export function rankByApr<T extends { apr: number | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.apr ?? -1) - (a.apr ?? -1));
}

/** Live ranking of high-octane vaults, compact enough to fit one phone screen. */
export function HotRankCard({ onEnter, onLater }: { onEnter: (v: Vault) => void; onLater: () => void }) {
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
      {rows.map(({ vault, apr }, i) => <button key={vault.id} type="button" onClick={() => onEnter(vault)} className={`hot-ring block w-full rounded-2xl p-[2px] text-left shadow-[var(--shadow-hot)] transition-transform active:scale-[0.98] ${vaultSkin(vault.id)}`}>
        <span className="relative isolate block overflow-hidden rounded-[calc(1rem-2px)] bg-[image:var(--gradient-hot)] px-3 py-2.5 text-hot-foreground">
          {vault.id === "dcty" ? <DctySkyline /> : <Sunset />}
          <span className="relative flex items-center justify-between gap-2">
            <VaultTitle vault={vault} className="h-6" />
            {i === 0 && <span className="flex items-center gap-1 rounded-full bg-hot-surface px-2 py-0.5 text-[10px] font-black uppercase"><Crown size={11} aria-hidden />#1</span>}
          </span>
          <span className="relative mt-1 block text-[11px] font-semibold">{t(HOOK[vault.id] ?? vault.pair)}</span>
          <span className="relative mt-1.5 flex items-end justify-between gap-2">
            <span><span className="block font-display text-2xl font-black leading-none tabular-nums">{apr == null ? "—" : `${apr.toLocaleString("es-MX", { maximumFractionDigits: 0 })}%`}</span><span className="text-[10px] font-medium opacity-80">{t("APR estimado · 24 h")}</span></span>
            <span className="flex items-center gap-1 rounded-xl bg-hot-surface px-3 py-2 text-xs font-black">{t("Depositar")}<ArrowRight size={14} aria-hidden /></span>
          </span>
        </span>
      </button>)}
    </div>
    <p className="mt-2.5 text-center text-[11px] text-muted-foreground">⚡ {t("Ambas con Piloto Automático: trabajan en la zona activa y se rebalancean solas 24/7.")}</p>
    <button type="button" onClick={onLater} className="mt-1 min-h-11 w-full text-center text-sm text-muted-foreground underline-offset-2 hover:underline">{t("Ver más tarde")}</button>
  </>;
}

/** Ranking popup in Mi Billetera for wallets with no vault: every visit without dollars, once every 3 visits with dollars. */
export function Gta6VideoPopup({ wallet }: { wallet: string | null | undefined }) {
  const q = useRealWallet(wallet ?? null);
  const ready = !!wallet && !!q.data?.success;
  const eligible = ready && showGta6Video(q.data?.success ? q.data.data.positions : []);
  const [open, setOpen] = useState(false);
  const [deposit, setDeposit] = useState<Vault | null>(null);
  const decided = useRef(false);
  const hasDollars = q.data?.success ? Number(q.data.data.usdc) > 0 : false;
  useEffect(() => {
    if (!eligible) return;
    if (decided.current) return; decided.current = true;
    let visit = 1;
    if (hasDollars) { try { visit = Number(localStorage.getItem(VISITS) || 0) + 1; localStorage.setItem(VISITS, String(visit)); } catch { /* show anyway */ } }
    if (gta6VideoDue(hasDollars, visit)) setOpen(true);
  }, [eligible, hasDollars]);
  if (!gta6) return null;
  return <>
    <Dialog open={open} onOpenChange={setOpen}>
      <ActionSheetContent><HotRankCard onEnter={(v) => { setOpen(false); setDeposit(v); }} onLater={() => setOpen(false)} /></ActionSheetContent>
    </Dialog>
    {deposit && <DepositSimulation vault={deposit} wallet={wallet ?? null} onClose={() => setDeposit(null)} />}
  </>;
}
