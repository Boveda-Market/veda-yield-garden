import { LightningBadge } from "@/components/lightning-badge";
import dobleLogo from "@/assets/doble-o-nada-logo.png";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DobleBannerSlide } from "@/components/doble-banners";
import { DctyBannerSlide } from "@/components/dcty-banners";
import { vaultSkin } from "@/components/vault-skin";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { useWalletVaults } from "@/components/wallet-positions";
import { RealPositions } from "@/components/real-positions";
import { HarvestDialog } from "@/components/harvest-dialog";
import { WithdrawalSimulation } from "@/components/withdrawal-simulation";
import { DepositSimulation } from "@/components/deposit-simulation";
import { isOperableVault, type ChainPosition, type OperableVault } from "@/lib/solana-data";
import type { Vault } from "@/lib/vaults";
import { ChevronRight, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { VAULTS } from "@/lib/vaults";
import { DuelLines, Gta6RotatingBanner } from "@/components/home-gta6";

const STEPS = 9;
const STEP_KEY = "boveda:wallet-banner";

/** Top rotation step: GTA6, Doble o Nada and DCTY slides take turns every 7 s (step % 3), starting on the next one each visit. */
function useBannerStep() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    let start = 0;
    try {
      const seen = sessionStorage.getItem(STEP_KEY);
      if (seen != null) start = Number(seen) % STEPS;
      else { start = (Number(localStorage.getItem(STEP_KEY) ?? -1) + 1) % STEPS; localStorage.setItem(STEP_KEY, String(start)); sessionStorage.setItem(STEP_KEY, String(start)); }
    } catch { /* storage blocked */ }
    setStep(Number.isFinite(start) ? start : 0);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setStep((v) => (v + 1) % STEPS), 7000);
    return () => clearInterval(id);
  }, []);
  return step;
}

/** Two compact, high-energy entry tiles kept at the top of Mi Billetera so they stay in the phone's first screen. APR is the live estimate, never hardcoded. */
export function WalletHeroShortcuts({ wallet }: { wallet?: string }) {
  const t = useT();
  const vaults = useWalletVaults(wallet ?? "");
  const all = wallet && vaults.data?.success ? vaults.data.data.positions : [];
  const mine = all.find((p) => p.vaultId === "gta6"), mineDcty = all.find((p) => p.vaultId === "dcty");
  // Which high-octane vault popup is open (GTA6 or DCTY); null when closed.
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId !== null, setOpen = (v: boolean) => { if (!v) setOpenId(null); };
  const openVault = VAULTS.find((v) => v.id === openId);
  const [harvest, setHarvest] = useState<{ position: string; vaultId: OperableVault; compound?: boolean } | null>(null);
  const [withdrawal, setWithdrawal] = useState<{ position: string; vaultId: OperableVault; migrateTo?: Vault; rotate?: boolean } | null>(null);
  const [deposit, setDeposit] = useState<{ vault: Vault; position?: string; amount?: string; migrate?: boolean } | null>(null);
  const mineAll = all.filter((p) => p.vaultId === openId);
  // Every action closes the popup first so only one sheet is ever on screen.
  const act = (p: ChainPosition, a: "harvest" | "exit" | "compound") => { if (!isOperableVault(p.vaultId)) return; setOpen(false); if (a === "exit") setWithdrawal({ position: p.address, vaultId: p.vaultId }); else setHarvest({ position: p.address, vaultId: p.vaultId, compound: a === "compound" }); };
  const move = (p: ChainPosition, target: Vault, rotate = false) => { if (!isOperableVault(p.vaultId) || !isOperableVault(target.id) || p.locked || (target.id === p.vaultId && !rotate)) return; setOpen(false); setWithdrawal({ position: p.address, vaultId: p.vaultId, migrateTo: target, ...(rotate ? { rotate: true } : {}) }); };
  const refetch = () => void vaults.refetch();
  const ctaFor = (m: ChainPosition | undefined) => m ? <><span>{m.outOfRange ? <><Zap size={14} aria-hidden className="mr-1 inline" />{t("Piloto automático la recentra")}</> : <>👉 {t("Oprime aquí para ver ganancias")}</>}</span><span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground">{t("Activa")} →</span></> : <><span>👉 {t("Oprime aquí para depositar")}</span><ChevronRight size={16} aria-hidden /></>;
  const cta = mine ? <><span>{mine.outOfRange ? <><Zap size={14} aria-hidden className="mr-1 inline" />{t("Piloto automático la recentra")}</> : <>👉 {t("Oprime aquí para ver ganancias")}</>}</span><span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground">{t("Activa")} →</span></> : <><span>👉 {t("Oprime aquí para depositar")}</span><ChevronRight size={16} aria-hidden /></>;
  const sub = t("Intereses con el volumen de GTA6");
  const step = useBannerStep();
  const kind = step % 3, isGta = kind === 0, isDoble = kind === 1, isDcty = kind === 2;
  const layer = (on: boolean) => `col-start-1 row-start-1 transition-opacity duration-700 ${on ? "opacity-100" : "pointer-events-none opacity-0"}`;
  const gtaBanner = <Gta6RotatingBanner cta={cta} sub={sub} index={Math.floor(step / 3)} dots={false} />;
  const dctyBanner = <DctyBannerSlide index={Math.floor(step / 3)} cta={ctaFor(mineDcty)} />;
  return <section aria-label={t("Bóveda GTA6")}>
    <div className="grid">
      <div className={layer(isGta)} inert={!isGta}>
        {mine ? <button type="button" onClick={() => setOpenId("gta6")} className="hot-ring cta-glow-hot block h-full w-full rounded-2xl p-[2px] text-left transition-transform active:scale-[0.98]">{gtaBanner}</button>
        : <Link to="/app" hash="open-gta6" className="hot-ring cta-glow-hot block h-full rounded-2xl p-[2px] transition-transform active:scale-[0.98]">{gtaBanner}</Link>}
      </div>
      <div className={layer(isDoble)} inert={!isDoble}>
        <Link to="/mercados" className="duel-ring block h-full rounded-2xl p-[2px] shadow-[var(--shadow-duel)] transition-transform active:scale-[0.98]"><DobleBannerSlide index={Math.floor(step / 3)} /></Link>
      </div>
      <div className={`${layer(isDcty)} vault-dcty`} inert={!isDcty}>
        {mineDcty ? <button type="button" onClick={() => setOpenId("dcty")} className="hot-ring cta-glow-hot block h-full w-full rounded-2xl p-[2px] text-left transition-transform active:scale-[0.98]">{dctyBanner}</button>
        : <Link to="/app" hash="open-dcty" className="hot-ring cta-glow-hot block h-full rounded-2xl p-[2px] transition-transform active:scale-[0.98]">{dctyBanner}</Link>}
      </div>
    </div>
    <div aria-hidden className="mt-2 flex justify-center gap-1">{Array.from({ length: STEPS }, (_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === step ? "w-4" : "w-1.5 opacity-40"} ${k % 3 === 0 ? "bg-hot" : k % 3 === 1 ? "bg-bolt-neon" : "bg-dcty"}`} />)}</div>
    <Dialog open={open} onOpenChange={setOpen}>
      <ActionSheetContent closeLabel={t("Cerrar")} className={vaultSkin(openId ?? undefined)}>
        <DialogHeader className="pr-10 text-left"><DialogTitle className="font-display text-xl">{openId === "dcty" ? t("Tu Bóveda DCTY") : t("Tu Bóveda GTA6")}</DialogTitle><DialogDescription className="sr-only">{t("Ver ganancias")}</DialogDescription></DialogHeader>
        {open && wallet && <RealPositions bare showHarvestBanner={false} positions={mineAll} onAction={act} onMigrate={(p, v) => move(p, v)} onRotate={(p, v) => move(p, v, true)} onDeposit={(p) => { if (!openVault) return; setOpen(false); setDeposit({ vault: openVault, position: p.address }); }} />}
      </ActionSheetContent>
    </Dialog>
    {wallet && harvest && <HarvestDialog wallet={wallet} position={harvest.position} vaultId={harvest.vaultId} compound={harvest.compound} onClose={() => { setHarvest(null); refetch(); }} />}
    {wallet && withdrawal && <WithdrawalSimulation wallet={wallet} {...withdrawal} onClose={() => { setWithdrawal(null); refetch(); }} onMigrated={(usdc, target) => { setWithdrawal(null); if (target) setDeposit({ vault: target, amount: usdc, migrate: true }); }} />}
    {wallet && deposit && <DepositSimulation key={`${deposit.vault.id}-${deposit.position ?? "new"}`} vault={deposit.vault} wallet={wallet} {...(deposit.position ? { position: deposit.position } : {})} initialAmount={deposit.amount ?? ""} migrate={Boolean(deposit.migrate)} onClose={() => { setDeposit(null); refetch(); }} />}
  </section>;
}

/** Full-width Doble o Nada shortcut, placed below Invita y Gana in Mi Billetera. */
export function DobleShortcut() {
  const t = useT();
  return <Link to="/mercados" className="cta-attn group relative block rounded-2xl bg-primary p-[2px] shadow-[0_0_24px_-6px_var(--primary)] transition-transform active:scale-[0.98]">
    <span className="relative isolate flex items-center justify-between gap-3 overflow-hidden rounded-[14px] bg-card p-3.5">
      <DuelLines />
      <span className="relative flex min-w-0 flex-col gap-1.5"><img src={dobleLogo} alt={t("Doble o Nada")} width={900} height={286} className="h-8 w-auto max-w-full self-start" /><LightningBadge suffix="5 min" /></span>
      <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-black uppercase text-primary"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex size-2 rounded-full bg-primary" /></span>{t("En vivo")}</span>
    </span>
  </Link>;
}
