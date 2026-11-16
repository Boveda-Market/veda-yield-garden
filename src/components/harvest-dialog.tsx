import { ServiceFeeLabel } from "@/components/service-fee-label";
import { DetailsToggle } from "@/components/ui/details-toggle";
import { vaultSymbol, type OperableVault } from "@/lib/solana-data";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, PenLine } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { simulateRealHarvest, prepareRealHarvest } from "@/lib/harvest.functions";
import { harvestedToUsdc, type HarvestResult } from "@/lib/harvest";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { ActionSuccess, ReceiveCard } from "@/components/action-success";
import { notify } from "@/lib/notify";
import { CompoundStep } from "@/components/compound-step";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";
import { ProgressSteps, WorkingLine } from "@/components/move-steps";

export function HarvestDialog({ wallet, position, vaultId, onClose, compound }: { wallet: string; position: string; vaultId: OperableVault; onClose: () => void; compound?: boolean | undefined }) {
  const t = useT();
  const simulate = useServerFn(simulateRealHarvest);
  const prepare = useServerFn(prepareRealHarvest);
  const readStatus = useServerFn(pilotDepositStatus);
  const reportAffiliate = useAffiliateReport();
  const session = useBovedaSession();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [step, setStep] = useState("");
  const [result, setResult] = useState<HarvestResult | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [extraUsd, setExtraUsd] = useState(0);
  const [sweepNote, setSweepNote] = useState<string | null>(null);
  const input = { wallet, position, vaultId };
  const canSign = session.authenticated && session.walletAddress === wallet;
  async function run() {
    if (pending) return;
    setPending(true); setResult(null); setMessage(null);
    try { setResult(await simulate({ data: input })); }
    catch { setResult({ success: false, sent: false, message: t("No se pudo consultar la cosecha. No se firmó ni envió nada.") }); }
    finally { setPending(false); }
  }
  // The quote is ready as soon as the window opens.
  useEffect(() => { void run(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function sign() {
    if (!canSign || pending || !result?.success || result.feeRaw === undefined || signature || finished) return;
    setPending(true); setMessage(null); setStep(t("Preparando tu cosecha…"));
    try {
      const next = await prepare({ data: { ...input, maximumFeeRaw: result.feeRaw } });
      setResult(next);
      if (!next.success || !next.prepared) { setMessage(next.message); return; }
      if (next.prepared.expiresAt <= Date.now() || next.prepared.wallet !== session.walletAddress || next.prepared.position !== position) { setMessage(t("La preparación caducó o la wallet cambió. Revisa nuevamente.")); return; }
      setStep(compound ? t("Aprueba en tu billetera (1 de 2)…") : t("Aprueba en tu billetera…"));
      let sig: string;
      try { sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch { setMessage(t("Cancelaste la aprobación. No se movió dinero.")); return; }
      setSignature(sig); notify("secure", t("Firma aprobada"), t("Confirmando en la red…")); setStep(t("Cobrando tus ganancias…"));
      for (let attempt = 0; attempt < 30; attempt++) {
        const status = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
        if (status.status === "failed") { setMessage(t("La red rechazó la cosecha. No se cobró comisión y tus ganancias siguen en la bóveda.")); return; }
        if (status.status !== "pending") {
          if (!compound && next.tokenRaw && BigInt(next.tokenRaw) > 0n && next.tokenSymbol) {
            setStep(t("Cosecha lista. Aprueba en tu billetera (2 de 2) para pasar todo a dólares…"));
            try { const extra = await harvestedToUsdc(wallet, next.tokenSymbol, BigInt(next.tokenRaw), session.signAndSend); if (extra > 0n) setExtraUsd(Number(extra) / 1e6); }
            catch { setSweepNote(t("Tus ganancias en dólares ya llegaron. La otra parte no se pasó a dólares; puedes hacerlo en Mi Billetera → Cambiar.")); }
          }
          if (!compound) notify("success", t("Ganancias cosechadas"), t("Ya están en tu billetera")); setFinished(true); setMessage(t("Cosecha confirmada en la red. Tu posición sigue abierta.")); void reportAffiliate(sig, "harvest"); await queryClient.invalidateQueries({ queryKey: ["real-solana", wallet] }); await queryClient.invalidateQueries({ queryKey: ["meteora-history", wallet] }); return; }
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
      setMessage(t("La confirmación tarda más de lo habitual. Revisa tu billetera antes de intentarlo otra vez."));
    } catch { setMessage(t("No se pudo preparar la cosecha. No se movió dinero.")); }
    finally { setPending(false); setStep(""); }
  }
  const coin = vaultSymbol(vaultId);
  const [compoundDone, setCompoundDone] = useState(false);
  const steps = [t("Cobrar ganancias"), t("Sumar a tu bóveda")];
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><ActionSheetContent closeLabel={t("Cerrar")}>
    <DialogTitle className={finished && (!compound || compoundDone) ? "sr-only" : undefined}>{compound ? t("Reinvertir ganancias ·") : t("Cosechar Ganancias ·")}{" "}{coin}</DialogTitle>
    <DialogDescription className={finished && (!compound || compoundDone) ? "sr-only" : undefined}>{compound ? t("Cobras tus ganancias y las sumamos a esta misma bóveda.") : t("Recibe las ganancias acumuladas. Tu depósito sigue en la bóveda generando más.")}</DialogDescription>
    {compound && signature && !compoundDone && <ProgressSteps steps={steps} current={finished ? 2 : 1} />}
    {finished && compound && result?.netRaw && result.tokenRaw ? <><p role="status" className="sr-only">{message}</p><CompoundStep wallet={wallet} position={position} vaultId={vaultId} usdcRaw={result.netRaw} tokenRaw={result.tokenRaw} netUsd={result.net} onClose={onClose} onProgress={setCompoundDone} /></>
    : finished ? <><p role="status" className="sr-only">{message}</p><ActionSuccess title={t("¡Ganancias cosechadas!")} amount={result?.net ? { value: (Number(result.net) + extraUsd).toFixed(2), unit: "$", ...(extraUsd > 0 ? { label: "≈" } : {}) } : undefined} details={[{ label: t("Operación"), value: t("Cosecha de ganancias") }, { label: t("Origen"), value: t("Bóveda {v}", { v: coin }) }, { label: t("Destino"), value: t("Tu billetera") }]} body={t("Las ganancias ya están en tu billetera y tu depósito sigue generando.")} signature={signature} onClose={onClose} />{sweepNote && <p role="status" className="text-sm text-muted-foreground">{sweepNote}</p>}</> : <>
    {pending && !step && <WorkingLine text={t("Calculando tus ganancias…")} />}
    {result && <div role="status" className="grid gap-3 text-sm">
      {!result.success && <><p className="font-semibold">{t("Cosecha no disponible")}</p><p className="leading-6 text-muted-foreground">{result.message}</p></>}
      {result.gross && <>
        <ReceiveCard label={compound ? t("Reinviertes") : t("Recibes")} amount={result.net ?? "—"} unit="$" sub={compound ? t("+ ganancias en {s}", { s: result.tokenSymbol ?? "" }) : t("+ la otra parte, convertida a dólares")} />
        <DetailsToggle><dl className="grid gap-2 rounded-xl border border-border p-4">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Ganancias en dólares")}</dt><dd>${result.gross}</dd></div>
          <div className="flex justify-between gap-3"><dt><ServiceFeeLabel t={t} /></dt><dd>−${result.fee}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Ganancias en")} {result.tokenSymbol}</dt><dd>{result.tokenAmount} · {t("sin comisión")}</dd></div>
        </dl></DetailsToggle>
      </>}
    </div>}
    {result && !result.success && !pending && <Button variant="outline" onClick={() => void run()}>{t("Intentar de nuevo")}</Button>}
    {pending && step && <WorkingLine text={step} />}
    {canSign && result?.success && !signature && <><Button size="lg" disabled={pending} onClick={() => void sign()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{pending ? step : compound ? t("Confirmar reinversión") : t("Confirmar cosecha")}</Button><p className="text-center text-xs text-muted-foreground">{compound ? t("Tu billetera te pedirá 2 aprobaciones seguidas.") : result.tokenRaw && BigInt(result.tokenRaw) > 0n ? t("2 aprobaciones seguidas: cobrar y pasar todo a dólares.") : t("Una sola aprobación. Tu depósito sigue invertido.")}</p></>}
    {!canSign && <p role="note" className="text-xs leading-5 text-muted-foreground">{t("Conecta la wallet propietaria para firmar esta cosecha. No hay movimientos hasta que firmes.")}</p>}
    {message && <p role="alert" className="text-sm">{message}</p>}
    </>}
  </ActionSheetContent></Dialog>;
}
