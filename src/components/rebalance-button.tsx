import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Crosshair, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { ActionSuccess } from "@/components/action-success";
import { useT } from "@/lib/i18n";
import { notify } from "@/lib/notify";
import { isDlmmVault, type ChainPosition, type OperableVault } from "@/lib/solana-data";
import { prepareRealRebalance } from "@/lib/rebalance.functions";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import type { RebalanceResult } from "@/lib/dlmm";
import { WorkingLine } from "@/components/move-steps";

/** One-tap, one-signature 50/50 rebalance for an out-of-range range-vault position. Renders nothing otherwise. */
export function RebalanceButton({ position, className }: { position: ChainPosition; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!position.outOfRange || position.locked || !isDlmmVault(position.vaultId)) return null;
  return <>
    <Button size="sm" className={className} onClick={() => setOpen(true)}><Crosshair size={14} />{t("Rebalancear")}</Button>
    {open && <RebalanceSheet position={position} onClose={() => setOpen(false)} />}
  </>;
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

  async function review() {
    setPending(true); setMessage(null);
    try { const next = await prepare({ data: input }); setQuote(next); if (!next.success) setMessage(next.message); }
    catch { setMessage(t("No se pudo preparar el rebalanceo. No se firmó ni envió nada.")); }
    finally { setPending(false); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (wallet) void review(); }, [wallet]);

  async function sign() {
    if (pending || done) return;
    setPending(true); setMessage(null); setStep(t("Preparando tu rebalanceo…"));
    try {
      const next = await prepare({ data: { ...input, prepare: true } });
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

  const symbol = quote?.tokenSymbol ?? position.symbol;
  return <Dialog open onOpenChange={(o) => { if (!o && !pending) onClose(); }}><ActionSheetContent closeLabel={t("Cerrar")}>
    {done ? <ActionSuccess title={t("¡Posición rebalanceada!")} body={t("Tus ganancias se sumaron y tu posición quedó centrada en el precio actual. Ya vuelve a generar.")} signature={signature} onClose={onClose}
      amount={quote?.valueUsd ? { value: `$${quote.valueUsd}`, unit: "" } : undefined}
      details={[]} /> : <>
      <DialogTitle>{t("Rebalancear posición")} · {symbol}</DialogTitle>
      <DialogDescription>{t("Tu posición salió del rango y no está generando. Con un toque cosechamos tus ganancias, dejamos mitad y mitad al precio actual y la volvemos a centrar.")}</DialogDescription>
      {pending && !quote && <WorkingLine text={t("Preparando tu rebalanceo…")} />}
      {quote?.success && <dl className="grid gap-2 rounded-xl border border-border p-4 text-sm">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Se recoloca")}</dt><dd className="font-semibold">≈ ${quote.valueUsd}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Ganancias que se suman")}</dt><dd>${quote.feesUsdc} + {quote.feesToken} {symbol}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Nuevo reparto")}</dt><dd>{t("Mitad {s} · mitad dólares", { s: symbol })}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Pequeño sobrante a tu billetera")}</dt><dd>${quote.usdcLeft} · {quote.tokenLeft} {symbol}</dd></div>
      </dl>}
      {quote?.success && <p className="text-xs leading-5 text-muted-foreground">{t("Para dejar mitad y mitad se cambia una parte dentro de la misma bóveda, con un límite de precio para protegerte. Es una sola firma.")}</p>}
      {pending && step && quote?.success && <WorkingLine text={step} />}
      {quote?.success && <Button size="lg" disabled={pending} onClick={() => void sign()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Crosshair className="mr-2 h-4 w-4" />}{pending && step ? step : t("Rebalancear ahora")}</Button>}
      {message && <p role="alert" className="text-sm">{message}</p>}
      {message && !pending && !quote?.success && <Button variant="secondary" onClick={() => void review()}>{t("Intentar de nuevo")}</Button>}
    </>}
  </ActionSheetContent></Dialog>;
}
