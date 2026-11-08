import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ReceiptText, LoaderCircle, PenLine } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { simulateRealHarvest, prepareRealHarvest } from "@/lib/harvest.functions";
import { isWithdrawalPilot } from "@/lib/withdrawal";
import type { HarvestResult } from "@/lib/harvest";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";

export function HarvestDialog({ wallet, position, vaultId, onClose }: { wallet: string; position: string; vaultId: "sol" | "met"; onClose: () => void }) {
  const simulate = useServerFn(simulateRealHarvest);
  const prepare = useServerFn(prepareRealHarvest);
  const readStatus = useServerFn(pilotDepositStatus);
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
  const canSign = isWithdrawalPilot(input) && session.authenticated && session.walletAddress === wallet;
  async function run() {
    if (pending) return;
    setPending(true); setResult(null); setAccepted(false); setMessage(null);
    try { setResult(await simulate({ data: input })); }
    catch { setResult({ success: false, sent: false, message: "No se pudo consultar la cosecha. No se firmó ni envió nada." }); }
    finally { setPending(false); }
  }
  async function sign() {
    if (!canSign || !accepted || pending || !result?.success || result.feeRaw === undefined || signature || finished) return;
    setPending(true); setMessage(null); setStep("Preparando tu cosecha…");
    try {
      const next = await prepare({ data: { ...input, maximumFeeRaw: result.feeRaw } });
      setResult(next);
      if (!next.success || !next.prepared) { setAccepted(false); setMessage(next.message); return; }
      if (next.prepared.expiresAt <= Date.now() || next.prepared.wallet !== session.walletAddress || next.prepared.position !== position) { setMessage("La preparación caducó o la wallet cambió. Revisa nuevamente."); return; }
      setStep("Esperando firma en tu wallet…");
      let sig: string;
      try { sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch { setMessage("La wallet canceló o rechazó la solicitud. Si pudo enviarse, revisa su historial antes de reintentar."); return; }
      setSignature(sig); setStep("Esperando confirmación en la red…");
      for (let attempt = 0; attempt < 30; attempt++) {
        const status = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
        if (status.status === "failed") { setMessage("La red rechazó la transacción: no se aplicaron la cosecha ni la comisión; puede cobrarse el coste de red."); return; }
        if (status.status !== "pending") { setFinished(true); setMessage("Cosecha confirmada en la red. Tu posición sigue abierta."); await queryClient.invalidateQueries({ queryKey: ["real-solana", wallet] }); return; }
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
      setMessage("Confirmación pendiente. Revisa Solscan antes de reintentar.");
    } catch { setMessage("No se pudo preparar la cosecha. No se pidió ninguna firma."); }
    finally { setPending(false); setStep(""); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>Cosechar Ganancias · {vaultId === "sol" ? "SOL" : "MET"}</DialogTitle>
    <DialogDescription>Red principal · retira solo las comisiones acumuladas; la liquidez principal permanece en el pool.</DialogDescription>
    <p className="break-all font-mono text-xs text-muted-foreground">{position}</p>
    <p className="text-xs leading-5 text-muted-foreground">Comisión del 1% sobre los USDC cosechados, en la misma transacción. La parte en {vaultId === "sol" ? "SOL" : "MET"} se entrega a tu wallet sin convertir ni cobrar comisión durante este piloto.</p>
    <Button disabled={pending} onClick={() => void run()}>{pending && !step ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ReceiptText className="mr-2 h-4 w-4" />}{pending && !step ? "Verificando cosecha…" : "Revisar cosecha"}</Button>
    {result && <div role="status" className="border-t border-border pt-4 text-sm"><p className="font-semibold">{result.success ? "Resumen de tu cosecha" : "Cosecha no disponible"}</p>{!result.success && <p className="mt-2 leading-6">{result.message}</p>}{result.gross && <dl className="mt-4 grid gap-2"><div className="flex justify-between gap-3"><dt>USDC cosechados</dt><dd>{result.gross}</dd></div><div className="flex justify-between gap-3"><dt>Comisión · 1%</dt><dd>{result.fee} USDC</dd></div><div className="flex justify-between gap-3"><dt>USDC netos</dt><dd>{result.net}</dd></div><div className="flex justify-between gap-3"><dt>{result.tokenSymbol} cosechados</dt><dd>{result.tokenAmount}</dd></div></dl>}{result.checks && <ul className="mt-4 space-y-1">{Object.entries(result.checks).map(([key, valid]) => <li key={key}>{({ position: "Posición sigue abierta", usdc: "USDC netos", fee: "Comisión exacta", token: "Token cosechado" } as Record<string, string>)[key]}: {valid ? "Comprobado antes de firmar" : "No verificado"}</li>)}</ul>}</div>}
    {canSign && result?.success && !signature && !finished && <><label className="flex items-start gap-3 text-xs leading-5"><Checkbox checked={accepted} disabled={pending} onCheckedChange={(value) => setAccepted(value === true)} aria-label="Acepto la cosecha piloto" /><span>Acepto cosechar las comisiones con dinero real, la comisión del 1% sobre los USDC y los costes de red.</span></label><Button disabled={!accepted || pending} onClick={() => void sign()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{pending ? step : "Firmar cosecha"}</Button></>}
    {!canSign && <p role="note" className="text-xs leading-5 text-muted-foreground">La firma está limitada a la posición SOL del piloto autorizado con su wallet propietaria conectada. No hay movimientos hasta que firmes.</p>}
    {message && <p role={finished ? "status" : "alert"} className="text-sm">{message}</p>}
    {signature && <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer" className="break-all text-xs underline">Ver cosecha en Solscan</a>}
  </DialogContent></Dialog>;
}
