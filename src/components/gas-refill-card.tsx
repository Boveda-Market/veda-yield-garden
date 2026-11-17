import { useEffect, useState } from "react";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { HotVaultCard } from "@/components/hot-vault-card";
import { DepositSimulation } from "@/components/deposit-simulation";
import { PoolDetails } from "@/components/pool-details";
import { VAULTS } from "@/lib/vaults";
import { BuyUsdc } from "@/components/buy-usdc";
import { notify } from "@/lib/notify";
import { CheckCircle2, Fuel, Loader2, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { prepareGasRefill } from "@/lib/gas-refill.functions";
import { activationShortfallMicro, gasIsLow, type RefillTarget } from "@/lib/gas-refill";
import { MIN_USDC_MICRO, unitsToDecimal } from "@/lib/onboarding";

/** `force` shows the card even above the low mark, for screens whose operation needs more reserve (refilled up to `target`). */
type Props = { sol: bigint | undefined; usdc: bigint | undefined; onDone?: () => void; force?: boolean; target?: RefillTarget };

/** Warns when the network reserve runs low and refills it from USDC in one signature, even at zero. */
export function GasRefillCard({ sol, usdc, onDone, force, target }: Props) {
  const t = useT();
  const session = useBovedaSession();
  const prepare = useServerFn(prepareGasRefill);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (sol === undefined || usdc === undefined || (!gasIsLow(sol) && !force && !msg)) return null;
  const empty = sol === 0n;
  // New and existing wallets low on reserve get the same activation: vault-ready reserve + fixed fee, one tap.
  const activation = !force && gasIsLow(sol) && usdc >= MIN_USDC_MICRO;
  async function refill() {
    if (!session.walletAddress) return;
    setBusy(true); setMsg(null);
    try {
      const r = await prepare({ data: { wallet: session.walletAddress, ...(target ? { target } : {}) } });
      if (!r.success) throw new Error(r.error); if (!r.transaction) throw new Error("No se pudo completar la recarga.");
      await session.signAndSend(Uint8Array.from(atob(r.transaction), (c) => c.charCodeAt(0)));
      notify("success", t("Reserva lista"), t("Ya puedes hacer movimientos"));
      setMsg({ ok: true, text: t("Listo: tu reserva para operaciones quedó activa (${usdc} de tus dólares). Ya puedes seguir usando tu cuenta con normalidad.", { usdc: unitsToDecimal(BigInt(r.chargeMicro), 6) }) });
      setTimeout(() => onDone?.(), 3000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? t(e.message) : t("No se pudo completar la recarga.") }); }
    finally { setBusy(false); }
  }
  if (activation) return <ActivationFlow usdc={usdc} wallet={session.walletAddress} prepare={prepare} signAndSend={session.signAndSend} onDone={onDone} />;
  return <section aria-label={t("Reserva para costos de red")} className={`rounded-2xl border p-4 ${empty ? "border-primary/20 bg-primary/5" : "border-accent bg-accent/30"}`}>
    <p className="flex items-center gap-2 font-semibold"><Fuel size={16} />{empty ? t("Te quedaste sin saldo para movimientos") : t("Te queda poco saldo para movimientos")}</p>
    <p className="mt-1 text-sm text-foreground/85">{t("Con un toque apartamos una pequeña parte de tus dólares (unos $2) para cubrir tus próximas operaciones. BÓVEDA cubre el costo de esta recarga.")}</p>
    {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-sm ${msg.ok ? "text-primary" : "text-muted-foreground"}`}>{msg.text}</p>}
    {!msg?.ok && <Button className="mt-3 w-full" disabled={busy || usdc <= 0n} onClick={() => void refill()}>{busy ? t("Preparando recarga…") : t("Recargar reserva de operaciones")}</Button>}
    {usdc <= 0n && <p className="mt-2 text-xs text-muted-foreground">{t("Necesitas tener dólares disponibles para recargar tu reserva.")}</p>}
  </section>;
}

export const PENDING_DEPOSIT_KEY = "boveda:pending-deposit";
const money = (micro: bigint) => `$${(Number(micro) / 1e6).toFixed(2)}`;
export type ActivationStage = { kind: "short"; missingMicro: bigint } | { kind: "ready"; totalMicro: bigint | null; error?: string } | { kind: "working" } | { kind: "done" };

/** First-time activation in one card: clean total → GTA6 wait → "Cuenta lista" that opens the GTA6 deposit. */
function ActivationFlow({ usdc, wallet, prepare, signAndSend, onDone }: { usdc: bigint; wallet: string | null | undefined; prepare: ReturnType<typeof useServerFn<typeof prepareGasRefill>>; signAndSend: (tx: Uint8Array) => Promise<string>; onDone?: (() => void) | undefined }) {
  const t = useT();
  const [sheet, setSheet] = useState(false);
  const [deposit, setDeposit] = useState(false);
  const [details, setDetails] = useState(false);
  const gta6 = VAULTS.find((v) => v.id === "gta6");
  const missing = activationShortfallMicro(usdc);
  const [total, setTotal] = useState<bigint | null>(null);
  const [stage, setStage] = useState<"ready" | "working" | "done">("ready");
  const [error, setError] = useState<string | undefined>();
  const [buy, setBuy] = useState(0);
  useEffect(() => {
    if (!wallet || missing > 0n) return;
    void prepare({ data: { wallet, activation: true, quoteOnly: true } }).then((r) => { if (r.success) setTotal(BigInt(r.chargeMicro)); }).catch(() => {});
  }, [wallet, missing > 0n]); // eslint-disable-line react-hooks/exhaustive-deps
  async function activate() {
    if (!wallet) return;
    setError(undefined); setStage("working");
    try {
      const r = await prepare({ data: { wallet, activation: true } });
      if (!r.success) throw new Error(r.error);
      if (!r.transaction) throw new Error("No se pudo preparar la activación.");
      await signAndSend(Uint8Array.from(atob(r.transaction), (c) => c.charCodeAt(0)));
      setStage("done"); onDone?.();
    } catch (e) { setError(e instanceof Error ? t(e.message) : t("No se pudo completar la activación.")); setStage("ready"); }
  }
  function openGta6() { setSheet(true); }
  const view: ActivationStage = stage === "done" ? { kind: "done" } : stage === "working" ? { kind: "working" } : missing > 0n ? { kind: "short", missingMicro: missing } : { kind: "ready", totalMicro: total, ...(error ? { error } : {}) };
  return <>
    <ActivationCardView stage={view} onActivate={() => void activate()} onAddFunds={() => setBuy((n) => n + 1)} onOpenVault={openGta6} />
    {buy > 0 && <BuyUsdc auto={buy} className="mt-2" />}
    {gta6 && <Dialog open={sheet} onOpenChange={setSheet}><ActionSheetContent><DialogTitle className="mb-3 text-lg font-bold">{t("Tu primera bóveda")}</DialogTitle>
      <HotVaultCard vault={gta6} owned={null} ownedLink={null} hasPosition={false} depositDisabled={!wallet} onDeposit={() => { setSheet(false); setDeposit(true); }} onDetails={() => setDetails(true)} />
    </ActionSheetContent></Dialog>}
    {gta6 && deposit && <DepositSimulation vault={gta6} wallet={wallet ?? null} onClose={() => setDeposit(false)} />}
    {gta6 && details && <PoolDetails vault={gta6} onClose={() => setDetails(false)} />}
  </>;
}

/** Pure view of the activation card (also rendered in the admin preview). */
export function ActivationCardView({ stage, onActivate, onAddFunds, onOpenVault }: { stage: ActivationStage; onActivate?: (() => void) | undefined; onAddFunds?: (() => void) | undefined; onOpenVault?: (() => void) | undefined }) {
  const t = useT();
  if (stage.kind === "working") return <section aria-label={t("Preparando tu acceso VIP")} aria-live="polite" className="hot-ring rounded-2xl p-[2px]">
    <div className="rounded-[14px] p-5 text-hot-foreground" style={{ backgroundImage: "var(--gradient-hot-surface)" }}>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-hot-2"><Loader2 size={14} className="animate-spin" />{t("Vice City · Modo VIP")}</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold">{t("Preparando tu acceso VIP…")}</h2>
      <p className="mt-1 text-sm leading-6 text-hot-muted">{t("Cargando tu reserva y configurando tu cuenta para que cobres como la casa. Esto toma solo unos segundos…")}</p>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-hot-foreground/10"><div className="activation-turbo h-full rounded-full" /></div>
      <p className="mt-2 text-xs text-hot-muted">{t("Confirma con tu huella o Face ID si te lo pide.")}</p>
    </div>
  </section>;
  if (stage.kind === "done") return <section aria-label={t("Cuenta lista")} role="status" className="hot-ring rounded-2xl p-[2px]">
    <div className="rounded-[14px] p-5 text-hot-foreground" style={{ backgroundImage: "var(--gradient-hot-surface)" }}>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-hot-2"><CheckCircle2 size={14} />{t("Completado")}</p>
      <h2 className="mt-2 font-display text-2xl font-extrabold">{t("Cuenta lista, ya puedes comenzar")}</h2>
      <p className="mt-1 text-sm leading-6 text-hot-muted">{t("Tu reserva de operaciones ya está activa. Tu billetera está 100% lista para generar comisiones.")}</p>
      <Button className="hot-cta mt-4 h-12 w-full rounded-xl text-base font-extrabold text-hot-surface" onClick={onOpenVault}>🎰 {t("Abrir mi primera bóveda")} →</Button>
    </div>
  </section>;
  if (stage.kind === "short") return <section aria-label={t("Estás a un paso de comenzar")} className="rounded-2xl border border-primary/40 bg-primary/10 p-5">
    <h2 className="font-display text-xl font-semibold">{t("Estás a un paso de comenzar")}</h2>
    <p className="mt-1 text-sm leading-6 text-foreground/85">{t("Te faltan {amount} para activar tu cuenta y abrir tu primera bóveda.", { amount: money(stage.missingMicro) })}</p>
    <Button className="mt-4 w-full" onClick={onAddFunds}><Sparkles size={16} />{t("Añadir lo que falta ({amount})", { amount: money(stage.missingMicro) })}</Button>
  </section>;
  const total = stage.totalMicro === null ? "…" : `~${money(stage.totalMicro)}`;
  return <section aria-label={t("Activa tu cuenta")} className="rounded-2xl border border-primary/40 bg-primary/10 p-5">
    <h2 className="font-display text-xl font-semibold">{t("Activa tu cuenta")}</h2>
    <p className="mt-1 text-sm leading-6 text-foreground/85">{t("Preparamos tu billetera para invertir en bóvedas y hacer tus movimientos sin trabas.")}</p>
    <p className="mt-3 text-sm text-muted-foreground">{t("Total estimado")} <span className="ml-1 font-display text-2xl font-bold text-foreground">{total}</span></p>
    {stage.error && <p role="alert" className="mt-2 text-sm text-muted-foreground">{stage.error}</p>}
    <Button className="mt-4 h-12 w-full text-base font-bold" disabled={stage.totalMicro === null} onClick={onActivate}><Sparkles size={16} />{t("Activar cuenta")} ({total})</Button>
  </section>;
}
