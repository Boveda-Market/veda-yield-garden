import dobleLogo from "@/assets/doble-o-nada-logo.png";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useWalletVaults } from "@/components/wallet-positions";
import { RealPositions } from "@/components/real-positions";
import { HarvestDialog } from "@/components/harvest-dialog";
import { WithdrawalSimulation } from "@/components/withdrawal-simulation";
import { DepositSimulation } from "@/components/deposit-simulation";
import { isOperableVault, type ChainPosition, type OperableVault } from "@/lib/solana-data";
import type { Vault } from "@/lib/vaults";
import { ChevronRight, Flame, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { poolYieldOptions } from "@/lib/pool-yield";
import { VAULTS } from "@/lib/vaults";

const gta6 = VAULTS.find((v) => v.id === "gta6");

/** Two compact, high-energy entry tiles kept at the top of Mi Billetera so they stay in the phone's first screen. APR is the live estimate, never hardcoded. */
export function WalletHeroShortcuts({ wallet }: { wallet?: string }) {
  const t = useT();
  const vaults = useWalletVaults(wallet ?? "");
  const mine = wallet && vaults.data?.success ? vaults.data.data.positions.find((p) => p.vaultId === "gta6") : undefined;
  const [open, setOpen] = useState(false);
  const [harvest, setHarvest] = useState<{ position: string; vaultId: OperableVault; compound?: boolean } | null>(null);
  const [withdrawal, setWithdrawal] = useState<{ position: string; vaultId: OperableVault; migrateTo?: Vault; rotate?: boolean } | null>(null);
  const [deposit, setDeposit] = useState<{ vault: Vault; position?: string; amount?: string; migrate?: boolean } | null>(null);
  const mineAll = wallet && vaults.data?.success ? vaults.data.data.positions.filter((p) => p.vaultId === "gta6") : [];
  // Every action closes the popup first so only one sheet is ever on screen.
  const act = (p: ChainPosition, a: "harvest" | "exit" | "compound") => { if (!isOperableVault(p.vaultId)) return; setOpen(false); if (a === "exit") setWithdrawal({ position: p.address, vaultId: p.vaultId }); else setHarvest({ position: p.address, vaultId: p.vaultId, compound: a === "compound" }); };
  const move = (p: ChainPosition, target: Vault, rotate = false) => { if (!isOperableVault(p.vaultId) || !isOperableVault(target.id) || p.locked || (target.id === p.vaultId && !rotate)) return; setOpen(false); setWithdrawal({ position: p.address, vaultId: p.vaultId, migrateTo: target, ...(rotate ? { rotate: true } : {}) }); };
  const refetch = () => void vaults.refetch();
  const y = useQuery({ ...poolYieldOptions(gta6?.pool ?? ""), enabled: !!gta6 });
  const apr = y.data?.apr;
  const aprLabel = apr != null && apr >= 100 ? `+${Math.round(apr).toLocaleString("en-US")}% APR` : t("Alto octanaje");
  return <section aria-label={t("Accesos rápidos")} className="grid grid-cols-2 gap-2 sm:gap-3">
    {mine ? <button type="button" onClick={() => setOpen(true)} className="hot-ring cta-attn cta-glow-hot group relative block rounded-2xl p-[2px] text-left transition-transform active:scale-[0.98]">
      <span className="relative flex h-full flex-col gap-1.5 overflow-hidden rounded-[14px] bg-[image:var(--gradient-hot-surface)] p-3 text-hot-foreground">
        <span className="hot-cta inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-hot-surface"><Zap size={12} aria-hidden />{mine.outOfRange ? t("Rebalancear") : t("Activa")}</span>
        <span className="font-display text-base font-bold leading-tight">{t("Bóveda GTA6")}</span>
        <span className="text-[11px] font-semibold leading-4">{t("Ver ganancias")} →</span>
      </span>
    </button> : <Link to="/app" className="hot-ring cta-attn cta-glow-hot group relative block rounded-2xl p-[2px] transition-transform active:scale-[0.98]">
      <span className="relative flex h-full flex-col gap-1.5 overflow-hidden rounded-[14px] bg-[image:var(--gradient-hot-surface)] p-3 text-hot-foreground">
        <span className="hot-cta inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-hot-surface"><Flame size={12} aria-hidden className="flame-flicker" />{aprLabel}</span>
        <span className="font-display text-base font-bold leading-tight">{t("Bóveda GTA6")}</span>
        <span className="text-[11px] leading-4 text-hot-muted">{t("Comisiones brutales con el volumen de GTA6")}</span>
        <ChevronRight size={16} aria-hidden className="absolute right-2 top-2 opacity-70 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>}
    <Link to="/mercados" className="cta-attn group relative block rounded-2xl bg-primary p-[2px] shadow-[0_0_24px_-6px_var(--primary)] transition-transform active:scale-[0.98]">
      <span className="relative flex h-full flex-col gap-1.5 overflow-hidden rounded-[14px] bg-card p-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-primary"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-primary" /></span>{t("En vivo")}</span>
        <span className="block"><img src={dobleLogo} alt={t("Doble o Nada")} width={900} height={286} className="h-8 w-auto max-w-full" /></span>
        <span className="text-[11px] leading-4 text-muted-foreground">{t("Rondas de 5 min · Hasta +90%")}</span>
        <ChevronRight size={16} aria-hidden className="absolute right-2 top-2 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
    <Dialog open={open} onOpenChange={setOpen}>
      <ActionSheetContent closeLabel={t("Cerrar")}>
        <DialogHeader className="pr-10 text-left"><DialogTitle className="font-display text-xl">{t("Tu Bóveda GTA6")}</DialogTitle><DialogDescription className="sr-only">{t("Ver ganancias")}</DialogDescription></DialogHeader>
        {open && wallet && <RealPositions bare showHarvestBanner={false} positions={mineAll} onAction={act} onMigrate={(p, v) => move(p, v)} onRotate={(p, v) => move(p, v, true)} onDeposit={(p) => { if (!gta6) return; setOpen(false); setDeposit({ vault: gta6, position: p.address }); }} />}
      </ActionSheetContent>
    </Dialog>
    {wallet && harvest && <HarvestDialog wallet={wallet} position={harvest.position} vaultId={harvest.vaultId} compound={harvest.compound} onClose={() => { setHarvest(null); refetch(); }} />}
    {wallet && withdrawal && <WithdrawalSimulation wallet={wallet} {...withdrawal} onClose={() => { setWithdrawal(null); refetch(); }} onMigrated={(usdc, target) => { setWithdrawal(null); if (target) setDeposit({ vault: target, amount: usdc, migrate: true }); }} />}
    {wallet && deposit && <DepositSimulation key={`${deposit.vault.id}-${deposit.position ?? "new"}`} vault={deposit.vault} wallet={wallet} {...(deposit.position ? { position: deposit.position } : {})} initialAmount={deposit.amount ?? ""} migrate={Boolean(deposit.migrate)} onClose={() => { setDeposit(null); refetch(); }} />}
  </section>;
}
