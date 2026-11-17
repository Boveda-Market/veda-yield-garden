import { Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Flame, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { poolYieldOptions } from "@/lib/pool-yield";
import { VAULTS, type Vault } from "@/lib/vaults";
import { isOperableVault, type ChainPosition } from "@/lib/solana-data";
import { useRealWallet } from "@/hooks/use-real-wallet";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { lazyWithReload } from "@/lib/lazy-reload";
const RangeAlertsGate = lazyWithReload(() => import("./range-alerts-gate").then((m) => ({ default: m.RangeAlertsGate })));

const gta6 = VAULTS.find((v) => v.id === "gta6");
const SEEN = "boveda:gta6-promo-seen";
const OPEN_GUIDE = "boveda:gta6-open-guide";

/** Positions that could move to GTA6: open, unlocked, operable, not already GTA6. */
export function gta6Candidate(positions: ChainPosition[]): ChainPosition | null {
  if (!gta6) return null;
  return positions.find((p) => p.vaultId !== gta6.id && !p.locked && isOperableVault(p.vaultId)) ?? null;
}

function useGta6Apr() {
  const t = useT();
  const y = useQuery({ ...poolYieldOptions(gta6?.pool ?? ""), enabled: !!gta6 });
  const apr = y.data?.apr;
  return apr != null && apr >= 100 ? `+${Math.round(apr).toLocaleString("en-US")}% APR` : t("Alto octanaje");
}

function Headline({ from }: { from?: string | undefined }) {
  const t = useT();
  const apr = useGta6Apr();
  return <>
    <span className="hot-cta inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-hot-surface"><Flame size={12} aria-hidden />{t("Nueva")} · {apr}</span>
    <p className="mt-2 font-display text-xl font-black leading-tight">{t("Bóveda GTA6: súper alto rendimiento")}</p>
    <p className="mt-1 text-sm leading-5 text-hot-muted">{from ? t("Tu dinero en {v} puede cobrar muchas más comisiones aquí. Traslado en un solo paso.", { v: from }) : t("Tu dinero puede cobrar muchas más comisiones aquí. Traslado en un solo paso.")}</p>
  </>;
}

/** Mandatory 3-step strategy shown before any move to GTA6. Telegram is recommended, not required. */
export function Gta6Guide({ open, onOpenChange, onStart }: { open: boolean; onOpenChange: (o: boolean) => void; onStart: () => void }) {
  const t = useT();
  const steps = [
    ["🎯", t("Tu dinero trabaja en la zona caliente"), t("Se concentra donde ocurren casi todos los intercambios. Por eso cobra tantas comisiones.")],
    ["⏸️", t("Si el precio se mueve fuerte, se pausa"), t("Tu dinero sigue seguro, pero deja de cobrar hasta que rebalancees.")],
    ["📲", t("Telegram te avisa, tú rebalanceas"), t("Te llega una alerta al móvil. Tocas 1 botón y vuelves a cobrar al instante.")],
  ] as const;
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92dvh] overflow-y-auto">
      <DialogTitle className="font-display text-xl">🔥 {t("Antes de empezar: la estrategia GTA6")}</DialogTitle>
      <DialogDescription>{t("3 pasos para mantener tu bóveda produciendo.")}</DialogDescription>
      <ol className="grid gap-3">{steps.map(([icon, title, body], i) => <li key={title} className="flex gap-3 rounded-xl border border-border p-3"><span aria-hidden className="text-2xl">{icon}</span><div><p className="text-sm font-bold">{i + 1}. {title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{body}</p></div></li>)}</ol>
      <Suspense fallback={null}><RangeAlertsGate /></Suspense>
      <p role="note" className="text-xs leading-5 text-muted-foreground">⚠️ {t("Recomendado: sin Telegram no te llegará el aviso si la bóveda se pausa y podrías dejar de ganar. Puedes continuar de todos modos.")}</p>
      <Button size="lg" className="hot-cta w-full font-bold text-hot-surface" onClick={onStart}>{t("Entendido, cambiar")} →</Button>
    </DialogContent>
  </Dialog>;
}

/** Always-visible banner in Bóvedas and Portafolio so a closed popup is easy to find again. */
export function Gta6PromoBanner({ positions, onMigrate, className = "mt-6" }: { positions: ChainPosition[]; onMigrate: (p: ChainPosition, v: Vault) => void; className?: string }) {
  const t = useT();
  const [guide, setGuide] = useState(false);
  const p = gta6Candidate(positions);
  const from = p ? VAULTS.find((v) => v.id === p.vaultId) : undefined;
  useEffect(() => { if (!p) return; try { if (sessionStorage.getItem(OPEN_GUIDE)) { sessionStorage.removeItem(OPEN_GUIDE); setGuide(true); } } catch { /* storage blocked */ } }, [p]);
  if (!p || !gta6) return null;
  return <div className={`hot-ring rounded-2xl p-[2px] ${className}`}>
    <div className="rounded-[calc(1rem-2px)] bg-[image:var(--gradient-hot-surface)] p-4 text-hot-foreground">
      <Headline from={from ? t(from.name) : undefined} />
      <Button size="lg" className="hot-cta mt-3 w-full font-bold text-hot-surface" onClick={() => setGuide(true)}>{t("Cambiar a GTA6 ahora")} →</Button>
    </div>
    <Gta6Guide open={guide} onOpenChange={setGuide} onStart={() => { setGuide(false); onMigrate(p, gta6); }} />
  </div>;
}

/** Once-per-session popup in Mi Billetera for users who already hold another vault. */
export function Gta6PromoPopup({ wallet, samplePositions }: { wallet: string | null | undefined; samplePositions?: ChainPosition[] }) {
  const t = useT();
  const navigate = useNavigate();
  const q = useRealWallet(wallet ?? null);
  const positions = samplePositions ?? (q.data?.success ? q.data.data.positions : []);
  const p = gta6Candidate(positions);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!p) return; try { if (sessionStorage.getItem(SEEN)) return; sessionStorage.setItem(SEEN, "1"); } catch { /* show anyway */ } setOpen(true); }, [p]);
  if (!p) return null;
  const from = VAULTS.find((v) => v.id === p.vaultId);
  const go = () => { try { sessionStorage.setItem(OPEN_GUIDE, "1"); } catch { /* banner still visible */ } setOpen(false); void navigate({ to: "/portfolio" }); };
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="hot-ring overflow-hidden border-0 p-[2px] [&>button]:hidden">
      <div className="rounded-[inherit] bg-[image:var(--gradient-hot-surface)] p-5 text-hot-foreground">
        <button type="button" aria-label={t("Cerrar")} onClick={() => setOpen(false)} className="float-right grid size-9 place-items-center rounded-full border border-hot-foreground/30 bg-hot-foreground/10 text-hot-foreground hover:bg-hot-foreground/20"><X size={18} /></button>
        <DialogTitle className="sr-only">{t("Bóveda GTA6: súper alto rendimiento")}</DialogTitle>
        <DialogDescription className="sr-only">{t("Ver estrategia y cambiar")}</DialogDescription>
        <Headline from={from ? t(from.name) : undefined} />
        <Button size="lg" className="hot-cta mt-4 w-full font-bold text-hot-surface" onClick={go}>{t("Ver estrategia y cambiar")} →</Button>
        <button type="button" onClick={() => setOpen(false)} className="mt-2 w-full text-center text-sm text-hot-muted underline-offset-2 hover:underline">{t("Ahora no")}</button>
        <p className="mt-2 text-center text-[11px] text-hot-muted">{t("Siempre lo encuentras en Bóvedas y Portafolio.")}</p>
      </div>
    </DialogContent>
  </Dialog>;
}
