import { useEffect, useState } from "react";
import { FundsKeptCard } from "@/components/funds-kept-card";
import { SignalErrorCard } from "@/components/signal-error";
import { DetailsToggle } from "@/components/ui/details-toggle";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Crosshair, LoaderCircle, Siren } from "lucide-react";
import { VAULTS } from "@/lib/vaults";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { ActionSuccess, ReceiveCard } from "@/components/action-success";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { coinLabel } from "@/lib/coin-label";
import { isDlmmVault, type ChainPosition, type OperableVault } from "@/lib/solana-data";
import { prepareRealRebalance } from "@/lib/rebalance.functions";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import type { RebalanceResult } from "@/lib/dlmm";
import { FlowSteps, WorkingLine } from "@/components/move-steps";
import { useAutopilot } from "@/components/autopilot-toggle";

/** One-tap, one-signature 50/50 rebalance for an out-of-range range-vault position. Renders nothing otherwise. */
export function RebalanceButton({ position, className, autoOpen = false, size = "sm", label }: { position: ChainPosition; className?: string; autoOpen?: boolean; size?: "sm" | "lg"; label?: string }) {
  const t = useT();
  const [open, setOpen] = useState(autoOpen);
  useEffect(() => { if (autoOpen) setOpen(true); }, [autoOpen]);
  if (!needsRebalance(position)) return null;
  return <>
    <Button size={size} className={className} onClick={() => setOpen(true)}><Crosshair size={size === "lg" ? 18 : 14} />{label ?? t("Rebalancear")}</Button>
    {open && <RebalanceSheet position={position} onClose={() => setOpen(false)} />}
  </>;
}

export const needsRebalance = (p: ChainPosition) => p.outOfRange && !p.locked && isDlmmVault(p.vaultId);

/**
 * Urgent Mi Billetera notice for every range position that is out of range (shown at once, no 10-min wait),
 * with the one-tap rebalance right there. `openFor` auto-opens the sheet for a deep-linked position.
 */
export function RangeUrgentBanner({ positions, openFor }: { positions: ChainPosition[]; openFor?: string | null }) {
  const t = useT();
  const out = positions.filter(needsRebalance);
  const autopilotOn = !!useAutopilot().status?.enabled;
  if (!out.length) return null;
  return <div className="grid gap-3">{out.map((p) => {
    const name = VAULTS.find((v) => v.id === p.vaultId)?.name;
    return <section key={p.address} role="alert" aria-label={t("Bóveda fuera de rango")} className="rounded-2xl border-2 border-destructive/50 bg-destructive/10 p-4">
      <div className="flex items-start gap-3">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/15 text-destructive"><Siren size={20} aria-hidden /><span className="absolute right-0 top-0 h-2.5 w-2.5 animate-ping rounded-full bg-destructive motion-reduce:animate-none" aria-hidden /></span>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">{t("Tu {v} dejó de generar ganancias", { v: name ? t(name) : `${p.symbol}/USDC` })}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{t("El precio salió de tu rango. Tu dinero sigue seguro, pero no cobras ganancias hasta que la vuelvas a centrar.")}</p>
        </div>
      </div>
      {autopilotOn && <p className="mt-3 rounded-lg bg-primary/10 p-2 text-center text-xs font-medium text-primary">🤖 {t("Tu piloto automático la recentrará en unos minutos. Si prefieres, hazlo ya:")}</p>}
      <RebalanceButton position={p} size="lg" className="mt-3 w-full font-bold" autoOpen={openFor === p.address} label={t("Rebalancear ahora")} />
    </section>;
  })}</div>;
}

function RebalanceSheet({ position, onClose }: { position: ChainPosition; onClose: () => void }) {
  const t = useT();
  const session = useBovedaSession();
  const prepare = useServerFn(prepareRealRebalance);
  const readStatus = useServerFn(pilotDepositStatus);
  const queryClient = useQueryClient();
  const wallet = session.walletAddress ?? "";
  const input = { wallet, position: position.address, vaultId: position.vaultId as OperableVault };
  const [quote, setQuote] = useState<RebalanceResult | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState("");
  const [kept, setKept] = useState(false);

  async function review() {
    setPending(true); setMessage(null);
    // Prepare the signable rebalance right away, so the confirm tap goes straight to the wallet approval.
    try { const next = await prepare({ data: { ...input, prepare: true } }); setQuote(next); if (!next.success) setMessage(next.message); }
    catch { setMessage(t("No se pudo preparar el rebalanceo. No se firmó ni envió nada.")); }
    finally { setPending(false); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (wallet) void review(); }, [wallet]);

  async function sign() {
    if (pending || done) return;
    setPending(true); setMessage(null); setStep(t("Preparando tu rebalanceo…"));
    try {
      const fresh = quote?.success && quote.prepared && Date.now() < quote.prepared.expiresAt - 10_000;
      const next = fresh ? quote! : await prepare({ data: { ...input, prepare: true } });
      setQuote(next);
      if (!next.success || !next.prepared) { setMessage(next.message); return; }
      if (next.prepared.wallet !== session.walletAddress) { setMessage(t("La wallet cambió. Revisa nuevamente.")); return; }
      setStep(t("Aprueba en tu billetera…"));
      let sig: string;
      try { sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch { setMessage(t("Cancelaste la aprobación. Tu posición sigue como estaba.")); return; }
      setSignature(sig); setStep(t("Centrando tu posición…"));
      for (let attempt = 0; attempt < 30; attempt++) {
        const status = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
        if (status.status === "failed") { setMessage(t("La red rechazó el rebalanceo; tu posición sigue como estaba.")); return; }
        if (status.status !== "pending") {
          notify("success", t("Posición rebalanceada"), t("Vuelve a generar ganancias"));
          setDone(true);
          await queryClient.invalidateQueries({ queryKey: ["real-solana", wallet] });
          await queryClient.invalidateQueries({ queryKey: ["meteora-history", wallet] });
          return;
        }
        await new Promise((r) => setTimeout(r, 2_000));
      }
      setMessage(t("La confirmación tarda más de lo habitual. Revisa tu billetera antes de intentarlo otra vez."));
    } catch { setMessage(t("No se pudo preparar el rebalanceo. No se firmó ni envió nada.")); }
    finally { setPending(false); setStep(""); }
  }

  const symbol = coinLabel(quote?.tokenSymbol ?? position.symbol, position.symbol);
  return <Dialog open onOpenChange={(o) => { if (o || pending) return; if (quote?.success && !signature && !done && !kept) setKept(true); else onClose(); }}><ActionSheetContent closeLabel={t("Cerrar")}>
    {kept ? <FundsKeptCard where="vault" onDone={onClose} /> : <>
    {done ? <ActionSuccess title={t("¡Posición rebalanceada!")} body={t("Tus ganancias se sumaron y tu posición quedó centrada en el precio actual. Ya vuelve a generar.")} signature={signature} onClose={onClose}
      amount={quote?.valueUsd ? { value: `$${quote.valueUsd}`, unit: "" } : undefined}
      details={[]} /> : <>
      <DialogTitle>{t("Rebalancear posición")} · {symbol}</DialogTitle>
      <DialogDescription>{t("Vuelve a generar ganancias al centrar tu posición.")}</DialogDescription>
      {quote?.success && !pending && <ReceiveCard label={t("Se recoloca")} amount={quote.valueUsd ?? "—"} unit="$" />}
      {pending && !quote && <WorkingLine text={t("Preparando tu rebalanceo…")} />}
      {quote?.success && !pending && <DetailsToggle><dl className="grid gap-2 rounded-xl border border-border p-4 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Se recoloca")}</dt><dd className="font-semibold">≈ ${quote.valueUsd}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Ganancias que se suman")}</dt><dd>${quote.feesUsdc} + {quote.feesToken} {symbol}</dd></div>
        {quote.bovedaFeeUsdc && Number(quote.bovedaFeeUsdc) > 0 && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Comisión")}</dt><dd>−${quote.bovedaFeeUsdc}</dd></div>}
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Nuevo reparto")}</dt><dd>{t("Mitad {s} · mitad dólares", { s: symbol })}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Pequeño sobrante a tu billetera")}</dt><dd>${quote.usdcLeft} · {quote.tokenLeft} {symbol}</dd></div>
      </dl><p className="text-xs leading-5 text-muted-foreground">{t("Tu posición salió del rango y no está generando. Cosechamos tus ganancias, dejamos mitad y mitad al precio actual y la volvemos a centrar.")} {t("Para dejar mitad y mitad se cambia una parte dentro de la misma bóveda, con un límite de precio para protegerte.")}</p></DetailsToggle>}
      {pending && signature && <FlowSteps current={2} />}
      {pending && step && quote?.success && <WorkingLine text={step} />}
      {quote?.success && <Button size="lg" disabled={pending} onClick={() => void sign()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Crosshair className="mr-2 h-4 w-4" />}{pending && step ? step : t("Rebalancear ahora")}</Button>}
      {message && <SignalErrorCard message={message} />}
      {message && !pending && !quote?.success && <Button onClick={() => void review()}>{t("Intentar de nuevo")}</Button>}
      {message && !pending && <Button variant="outline" onClick={onClose}>{t("Cerrar")}</Button>}
    </>}
    </>}
  </ActionSheetContent></Dialog>;
}
