import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ReceiptText, LoaderCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { simulateRealWithdrawal, prepareRealWithdrawal } from "@/lib/withdrawal.functions";
import { withdrawalInput, isWithdrawalPilot, type WithdrawalResult } from "@/lib/withdrawal";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { Checkbox } from "@/components/ui/checkbox";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";
import { useQueryClient } from "@tanstack/react-query";

export function WithdrawalSimulation({ wallet, position, vaultId, onClose }: { wallet: string | null; position?: string; vaultId: "sol" | "met"; onClose: () => void }) {
  const simulate = useServerFn(simulateRealWithdrawal);
  const prepare = useServerFn(prepareRealWithdrawal);
  const readStatus = useServerFn(pilotDepositStatus);
  const session = useBovedaSession();
  const queryClient = useQueryClient();
  const [address, setAddress] = useState(wallet ?? "");
  const [positionAddress, setPositionAddress] = useState(position ?? "");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<WithdrawalResult | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const input = withdrawalInput.safeParse({ wallet: address, position: positionAddress, vaultId });
  async function run() {
    if (!input.success || pending) return;
    setPending(true); setResult(null); setAccepted(false); setMessage(null);
    try { setResult(await simulate({ data: input.data })); }
    catch { setResult({ success: false, sent: false, message: "No se pudo consultar el retiro. No se firmó ni envió nada." }); }
    finally { setPending(false); }
  }
  const canSign = input.success && isWithdrawalPilot(input.data) && session.authenticated && session.walletAddress === address && wallet === address;
  async function signWithdrawal() {
    if (!input.success || !canSign || !accepted || pending || !result?.success || !result.feeRaw || !result.minimumNetRaw || finished || signature) return;
    setPending(true); setMessage(null); setStep("Preparando tu retiro…");
    try {
      const next = await prepare({ data: { ...input.data, maximumFeeRaw: result.feeRaw, minimumNetRaw: result.minimumNetRaw } });
      setResult(next);
      if (!next.success || !next.prepared) { setAccepted(false); setMessage(next.message); return; }
      if (next.prepared.expiresAt <= Date.now() || next.prepared.wallet !== session.walletAddress || next.prepared.position !== positionAddress) { setMessage("La preparación caducó o la wallet cambió. Revisa nuevamente el retiro."); return; }
      setStep("Esperando firma en tu wallet…");
      let sig: string;
      try { sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch { setMessage("La wallet canceló o rechazó la solicitud. Si pudo enviarse, revisa su historial antes de reintentar."); return; }
      setSignature(sig); setStep("Esperando confirmación en la red…");
      for (let attempt = 0; attempt < 30; attempt++) {
        const status = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
        if (status.status === "failed") { setMessage("La red rechazó la transacción atómica: no se aplicaron el retiro ni la comisión; puede cobrarse el coste de red."); return; }
        if (status.status !== "pending") { setFinished(true); setMessage("Liquidación confirmada en la red. Consulta los importes finales y la renta devuelta en Solscan."); await queryClient.invalidateQueries({ queryKey: ["real-solana", address] }); return; }
        await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
      setMessage("Confirmación pendiente. Revisa Solscan antes de reintentar; no envíes una segunda liquidación.");
    } catch { setMessage("No se pudo preparar el retiro. No se pidió ninguna firma."); }
    finally { setPending(false); setStep(""); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>Retiro a USDC · {vaultId === "sol" ? "SOL" : "MET"}</DialogTitle>
    <DialogDescription>Cierra tu posición y recibe USDC en tu wallet.</DialogDescription>
    <label className="grid gap-2 text-sm">Wallet propietaria<Input aria-label="Wallet propietaria" value={address} disabled={pending || Boolean(wallet) || Boolean(signature)} maxLength={44} onChange={(e) => { setAddress(e.target.value.trim()); setResult(null); setAccepted(false); }} /></label>
    <label className="grid gap-2 text-sm">Dirección de la posición<Input aria-label="Dirección de la posición" value={positionAddress} disabled={pending || Boolean(position) || Boolean(signature)} maxLength={44} onChange={(e) => { setPositionAddress(e.target.value.trim()); setResult(null); setAccepted(false); }} /></label>
    <p className="text-xs leading-5 text-muted-foreground">Retiro completo de liquidez no bloqueada, conversión a USDC y cierre de la posición y su NFT. Comisión fija del 1% sobre el mínimo bruto protegido por slippage, no sobre el importe final: cualquier USDC adicional es tuyo. La renta se devuelve en SOL, sin esta comisión. No se admiten posiciones bloqueadas ni recompensas adicionales.</p>
    <Button disabled={pending || !input.success} onClick={() => void run()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ReceiptText className="mr-2 h-4 w-4" />}{pending ? "Verificando retiro…" : "Revisar retiro"}</Button>
    {result && <div role="status" className="border-t border-border pt-4 text-sm"><p className="font-semibold">{result.success ? "Resumen de tu retiro" : "Retiro no disponible"}</p>{!result.success && <p className="mt-2 leading-6">{result.message}</p>}{result.gross && <dl className="mt-4 grid gap-2"><div className="flex justify-between gap-3"><dt>USDC antes de comisión</dt><dd>{result.gross}</dd></div><div className="flex justify-between gap-3"><dt>Comisión · 1%</dt><dd>{result.fee} USDC</dd></div><div className="flex justify-between gap-3"><dt>USDC estimados a recibir</dt><dd>{result.net} USDC</dd></div><div className="flex justify-between gap-3"><dt>Renta de posición y NFT</dt><dd>{result.rentSol} SOL</dd></div></dl>}{result.checks && <ul className="mt-4 space-y-1">{Object.entries(result.checks).map(([key, valid]) => <li key={key}>{({ closed: "Cierre de posición y NFT", usdc: "Devolución de USDC", fee: "Comisión exacta", rent: "Devolución de renta en SOL" } as Record<string, string>)[key]}: {valid ? "Comprobado antes de firmar" : "No verificado"}</li>)}</ul>}</div>}
    {result?.remainingTokenRaw && result.remainingTokenRaw !== "0" && <p role="alert" className="text-xs leading-5 text-destructive">Diferencia de tokens tras la conversión: {result.remainingTokenRaw} unidades mínimas. No es un importe en USD; la liquidación no está validada.</p>}
    {result?.minimumGross && <dl className="grid gap-2 border-t border-border pt-3 text-sm"><div className="flex justify-between gap-3"><dt>Mínimo bruto protegido</dt><dd>{result.minimumGross} USDC</dd></div><div className="flex justify-between gap-3"><dt>Mínimo neto tras comisión</dt><dd>{result.minimumNet} USDC</dd></div></dl>}
    {canSign && result?.success && !signature && !finished && <><label className="flex items-start gap-3 text-xs leading-5"><Checkbox checked={accepted} disabled={pending} onCheckedChange={(value) => setAccepted(value === true)} aria-label="Acepto la liquidación piloto" /><span>Acepto cerrar esta posición con dinero real, la comisión sobre el mínimo protegido y los costes de red. La operación no se puede revertir.</span></label><Button disabled={!accepted || pending} onClick={() => void signWithdrawal()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{pending ? step : "Firmar liquidación a USDC"}</Button></>}
    {!canSign && <p role="note" className="text-xs leading-5 text-muted-foreground">La firma está limitada a la posición SOL del piloto autorizado y requiere conectar su wallet propietaria. No hay movimientos hasta que firmes.</p>}
    {message && <p role={finished ? "status" : "alert"} className="text-sm">{message}</p>}
    {signature && <a href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noreferrer" className="break-all text-xs underline">Ver liquidación en Solscan</a>}
  </DialogContent></Dialog>;
}