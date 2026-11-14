import { ServiceFeeLabel } from "@/components/service-fee-label";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { useT } from "@/lib/i18n";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ReceiptText, LoaderCircle, PenLine, Repeat } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { simulateRealHarvest, prepareRealHarvest } from "@/lib/harvest.functions";
import type { HarvestResult } from "@/lib/harvest";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { ActionSuccess, ReceiveCard } from "@/components/action-success";
import { notify } from "@/lib/notify";
import { CompoundStep } from "@/components/compound-step";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";

export function HarvestDialog({ wallet, position, vaultId, onClose, compound }: { wallet: string; position: string; vaultId: "sol" | "met"; onClose: () => void; compound?: boolean | undefined }) {
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
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const input = { wallet, position, vaultId };
  const canSign = session.authenticated && session.walletAddress === wallet;
  async function run() {
    if (pending) return;
    setPending(true); setResult(null); setAccepted(false); setMessage(null);
    try { setResult(await simulate({ data: input })); }
    catch { setResult({ success: false, sent: false, message: t("No se pudo consultar la cosecha. No se firmó ni envió nada.") }); }
    finally { setPending(false); }
  }
  async function sign() {
    if (!canSign || !accepted || pending || !result?.success || result.feeRaw === undefined || signature || finished) return;
    setPending(true); setMessage(null); setStep(t("Preparando tu cosecha…"));
    try {
      const next = await prepare({ data: { ...input, maximumFeeRaw: result.feeRaw } });
      setResult(next);
      if (!next.success || !next.prepared) { setAccepted(false); setMessage(next.message); return; }
      if (next.prepared.expiresAt <= Date.now() || next.prepared.wallet !== session.walletAddress || next.prepared.position !== position) { setMessage(t("La preparación caducó o la wallet cambió. Revisa nuevamente.")); return; }
      setStep(t("Esperando firma en tu wallet…"));
      let sig: string;
      try { sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch { setMessage(t("La wallet canceló o rechazó la solicitud. Si pudo enviarse, revisa su historial antes de reintentar.")); return; }
      setSignature(sig); notify("secure", t("Firma aprobada"), t("Confirmando en la red…")); setStep(t("Esperando confirmación en la red…"));
      for (let attempt = 0; attempt < 30; attempt++) {
        const status = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
        if (status.status === "failed") { setMessage(t("La red rechazó la transacción: no se aplicaron la cosecha ni la comisión; puede cobrarse el coste de red.")); return; }
        if (status.status !== "pending") { notify("success", t("Ganancias cosechadas"), t("Ya están en tu billetera")); setFinished(true); setMessage(t("Cosecha confirmada en la red. Tu posición sigue abierta.")); void reportAffiliate(sig, "harvest"); await queryClient.invalidateQueries({ queryKey: ["real-solana", wallet] }); await queryClient.invalidateQueries({ queryKey: ["meteora-history", wallet] }); return; }
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
      setMessage(t("Confirmación pendiente. Revisa Helius antes de reintentar."));
    } catch { setMessage(t("No se pudo preparar la cosecha. No se pidió ninguna firma.")); }
    finally { setPending(false); setStep(""); }
  }
  const coin = vaultId === "sol" ? "SOL" : "MET";
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>{compound ? t("Reinvertir ganancias ·") : t("Cosechar Ganancias ·")}{" "}{coin}</DialogTitle>
    <DialogDescription>{compound ? t("Dos pasos: primero cosechas tus ganancias y luego sumas los USDC y el otro token cosechados a esta misma posición. Firmas cada paso por separado.") : t("Recibe las ganancias acumuladas. Tu depósito sigue en la bóveda generando más.")}</DialogDescription>
    {finished ? <><p role="status" className="sr-only">{message}</p><ActionSuccess title={t("¡Ganancias cosechadas!")} amount={result?.net ? { value: result.net, unit: "USDC" } : undefined} details={[{ label: t("Operación"), value: t("Cosecha de ganancias") }, { label: t("Origen"), value: t("Bóveda {v}", { v: vaultId === "sol" ? "SOL" : "MET" }) }, { label: t("Destino"), value: t("Tu billetera") }]} body={t("Las ganancias ya están en tu wallet y tu depósito sigue generando.")} signature={signature} onClose={onClose} />{compound && result?.netRaw && result.tokenRaw && <CompoundStep wallet={wallet} position={position} vaultId={vaultId} usdcRaw={result.netRaw} tokenRaw={result.tokenRaw} />}</> : <>
    {!result?.success && <Button variant={result ? "outline" : "default"} disabled={pending} onClick={() => void run()}>{pending && !step ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ReceiptText className="mr-2 h-4 w-4" />}{pending && !step ? t("Calculando tus ganancias…") : t("Revisar cosecha")}</Button>}
    {result && <div role="status" className="grid gap-3 text-sm">
      {!result.success && <><p className="font-semibold">{t("Cosecha no disponible")}</p><p className="leading-6 text-muted-foreground">{result.message}</p></>}
      {result.gross && <>
        <ReceiveCard label={t("Recibes")} amount={result.net ?? "—"} unit="USDC" sub={`+ ${result.tokenAmount} ${result.tokenSymbol}`} />
        <dl className="grid gap-2 rounded-xl border border-border p-4">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Ganancias en USDC")}</dt><dd>{result.gross}</dd></div>
          <div className="flex justify-between gap-3"><dt><ServiceFeeLabel t={t} /></dt><dd>−{result.fee} USDC</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Ganancias en")} {result.tokenSymbol}</dt><dd>{result.tokenAmount} · {t("sin comisión")}</dd></div>
        </dl>
      </>}
      {result.checks && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{t("Ver verificaciones de seguridad")}</summary><ul className="mt-2 space-y-1">{Object.entries(result.checks).map(([key, valid]) => <li key={key}>{({ position: t("Posición sigue abierta"), usdc: t("USDC netos"), fee: t("Comisión exacta"), token: t("Token cosechado") } as Record<string, string>)[key]}: {valid ? t("Comprobado antes de firmar") : t("No verificado")}</li>)}</ul></details>}
    </div>}
    {canSign && result?.success && !signature && <><label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground"><Checkbox checked={accepted} disabled={pending} onCheckedChange={(value) => setAccepted(value === true)} aria-label={t("Acepto la cosecha real")} /><span>{t("Revisé el resumen. La comisión se descuenta de los USDC; el costo de red se paga en SOL.")}</span></label><Button size="lg" disabled={!accepted || pending} onClick={() => void sign()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{pending ? step : t("Firmar cosecha")}</Button></>}
    {!canSign && <p role="note" className="text-xs leading-5 text-muted-foreground">{t("Conecta la wallet propietaria para firmar esta cosecha. No hay movimientos hasta que firmes.")}</p>}
    {message && <p role="alert" className="text-sm">{message}</p>}
    {signature && <a href={`https://orbmarkets.io/tx/${signature}`} target="_blank" rel="noreferrer" className="break-all text-xs underline">{t("Ver comprobante")}</a>}
    </>}
  </DialogContent></Dialog>;
}
