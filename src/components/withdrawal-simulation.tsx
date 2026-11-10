import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ReceiptText, LoaderCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { simulateRealWithdrawal, prepareRealWithdrawal } from "@/lib/withdrawal.functions";
import { exitInput, EXIT_PERCENTS, type WithdrawalResult } from "@/lib/withdrawal";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { ActionSuccess, ReceiveCard } from "@/components/action-success";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

export function WithdrawalSimulation({ wallet, position, vaultId, onClose }: { wallet: string | null; position?: string; vaultId: "sol" | "met"; onClose: () => void }) {
  const t = useT();
  const simulate = useServerFn(simulateRealWithdrawal);
  const prepare = useServerFn(prepareRealWithdrawal);
  const readStatus = useServerFn(pilotDepositStatus);
  const reportAffiliate = useAffiliateReport();
  const session = useBovedaSession();
  const queryClient = useQueryClient();
  const [address, setAddress] = useState(wallet ?? "");
  const [positionAddress, setPositionAddress] = useState(position ?? "");
  const [percent, setPercent] = useState(100);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<WithdrawalResult | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const input = exitInput.safeParse({ wallet: address, position: positionAddress, vaultId, percent });
  async function run() {
    if (!input.success || pending) return;
    setPending(true); setResult(null); setAccepted(false); setMessage(null);
    try { setResult(await simulate({ data: input.data })); }
    catch { setResult({ success: false, sent: false, message: t("No se pudo consultar el retiro. No se firmó ni envió nada.") }); }
    finally { setPending(false); }
  }
  // Review starts automatically once the owner wallet and position are known.
  const autoKey = input.success ? `${address}:${positionAddress}:${percent}` : "";
  useEffect(() => { if (autoKey && !signature) void run(); }, [autoKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const canSign = input.success && session.authenticated && session.walletAddress === address && wallet === address;
  async function signWithdrawal() {
    if (!input.success || !canSign || pending || !result?.success || !result.feeRaw || !result.minimumNetRaw || finished || signature) return;
    setPending(true); setMessage(null); setStep(t("Preparando tu retiro…"));
    try {
      const next = await prepare({ data: { ...input.data, maximumFeeRaw: result.feeRaw, minimumNetRaw: result.minimumNetRaw } });
      setResult(next);
      if (!next.success || !next.prepared) { setAccepted(false); const moved = next.message.includes("cotización cambió"); setMessage(moved ? t("El precio se movió. Actualizamos el resumen; toca «Firmar» de nuevo.") : next.message); if (moved) { try { setResult(await simulate({ data: input.data })); } catch { /* keep message */ } } return; }
      if (next.prepared.expiresAt <= Date.now() || next.prepared.wallet !== session.walletAddress || next.prepared.position !== positionAddress) { setMessage(t("La preparación caducó o la wallet cambió. Revisa nuevamente el retiro.")); return; }
      setStep(t("Esperando firma en tu wallet…"));
      let sig: string;
      try { sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch { setMessage(t("La wallet canceló o rechazó la solicitud. Si pudo enviarse, revisa su historial antes de reintentar.")); return; }
      setSignature(sig); setStep(t("Esperando confirmación en la red…"));
      for (let attempt = 0; attempt < 60; attempt++) {
        const status = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
        if (status.status === "failed") { setMessage(t("La red rechazó la transacción atómica: no se aplicaron el retiro ni la comisión; puede cobrarse el coste de red.")); return; }
        if (status.status !== "pending") { setFinished(true); setMessage(t("Liquidación confirmada en la red. Consulta los importes finales y la renta devuelta en Helius.")); void reportAffiliate(sig, "exit"); await queryClient.invalidateQueries({ queryKey: ["real-solana", address] }); await queryClient.invalidateQueries({ queryKey: ["meteora-history", address] }); return; }
        await new Promise((resolve) => setTimeout(resolve, attempt < 10 ? 800 : 2_000));
      }
      setMessage(t("Confirmación pendiente. Revisa Helius antes de reintentar; no envíes una segunda liquidación."));
    } catch { setMessage(t("No se pudo preparar el retiro. No se pidió ninguna firma.")); }
    finally { setPending(false); setStep(""); }
  }
  const prefilled = Boolean(wallet && position);
  const inputs = <>
    <label className="grid gap-2 text-sm">{t("Wallet propietaria")}<Input aria-label={t("Wallet propietaria")} value={address} disabled={pending || Boolean(wallet) || Boolean(signature)} maxLength={44} onChange={(e) => { setAddress(e.target.value.trim()); setResult(null); setAccepted(false); }} /></label>
    <label className="grid gap-2 text-sm">{t("Dirección de la posición")}<Input aria-label={t("Dirección de la posición")} value={positionAddress} disabled={pending || Boolean(position) || Boolean(signature)} maxLength={44} onChange={(e) => { setPositionAddress(e.target.value.trim()); setResult(null); setAccepted(false); }} /></label>
  </>;
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>{t("Retiro a USDC ·")}{" "}{vaultId === "sol" ? "SOL" : "MET"}</DialogTitle>
    <DialogDescription>{t("Elige cuánto retirar y recíbelo en USDC en tu wallet.")}</DialogDescription>
    {!finished && !signature && <div role="radiogroup" aria-label={t("Cuánto retirar")} className="grid grid-cols-4 gap-2">{EXIT_PERCENTS.map((p) => <Button key={p} type="button" role="radio" aria-checked={percent === p} variant={percent === p ? "default" : "outline"} disabled={pending} onClick={() => { setPercent(p); setResult(null); setAccepted(false); setMessage(null); }}>{p === 100 ? t("Todo") : `${p}%`}</Button>)}</div>}
    {!finished && !signature && <p className="text-xs text-muted-foreground">{percent === 100 ? t("Cierras la posición y recuperas el SOL de apertura.") : t("Retiras el {p}% y el resto sigue invirtiendo en la bóveda.", { p: String(percent) })}</p>}
    {finished ? <><p role="status" className="sr-only">{message}</p><ActionSuccess title={t("¡Retiro completado!")} body={percent === 100 ? t("Tus USDC ya están en tu wallet. También recuperaste el SOL de apertura de la posición.") : t("Tus USDC ya están en tu wallet. El resto de tu posición sigue invertido.")} signature={signature} onClose={onClose} /></> : <>
    {!prefilled && inputs}
    {(!result || !result.success) && <Button variant={result ? "outline" : "default"} disabled={pending || !input.success} onClick={() => void run()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ReceiptText className="mr-2 h-4 w-4" />}{pending ? t("Calculando tu retiro…") : t("Revisar retiro")}</Button>}
    {result && <div role="status" className="grid gap-3 text-sm">
      {!result.success && <><p className="font-semibold">{t("Retiro no disponible")}</p><p className="leading-6 text-muted-foreground">{result.message}</p></>}
      {result.gross && <>
        <ReceiveCard label={t("Recibes aproximadamente")} amount={result.net ?? "—"} unit="USDC" sub={result.minimumNet ? `${t("Mínimo garantizado:")} ${result.minimumNet} USDC${percent === 100 ? ` · + ${result.rentSol} SOL ${t("de vuelta")}` : ""}` : undefined} />
        <dl className="grid gap-2 rounded-xl border border-border p-4">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Valor de tu posición")}</dt><dd>{result.gross} USDC</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Comisión BÓVEDA")}</dt><dd>−{result.fee} USDC</dd></div>
          {percent === 100 && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("SOL de apertura devuelto")}</dt><dd>{result.rentSol} SOL</dd></div>}
        </dl>
      </>}
      {(result.checks || result.minimumGross) && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{t("Ver detalles y verificaciones")}</summary>
        <p className="mt-2 leading-5">{t("La comisión se calcula sobre el mínimo protegido por variación de precio; cualquier USDC adicional es tuyo. Las posiciones bloqueadas no se pueden retirar.")}</p>
        {result.minimumGross && <dl className="mt-2 grid gap-1"><div className="flex justify-between gap-3"><dt>{t("Mínimo bruto protegido")}</dt><dd>{result.minimumGross} USDC</dd></div><div className="flex justify-between gap-3"><dt>{t("Mínimo neto tras comisión")}</dt><dd>{result.minimumNet} USDC</dd></div></dl>}
        {result.checks && <ul className="mt-2 space-y-1">{Object.entries(result.checks).map(([key, valid]) => <li key={key}>{({ closed: percent === 100 ? t("Cierre de posición y NFT") : t("La posición sigue en tu wallet"), usdc: t("Devolución de USDC"), fee: t("Comisión exacta"), rent: t("Devolución de renta en SOL") } as Record<string, string>)[key]}: {valid ? t("Comprobado antes de firmar") : t("No verificado")}</li>)}</ul>}
        {prefilled && <p className="mt-2 break-all font-mono">{positionAddress}</p>}
      </details>}
    </div>}
    {result?.remainingTokenRaw && result.remainingTokenRaw !== "0" && <p role="alert" className="text-xs leading-5 text-destructive">{t("Diferencia de tokens tras la conversión:")}{" "}{result.remainingTokenRaw} {t("unidades mínimas. No es un importe en USD; la liquidación no está validada.")}</p>}
    {canSign && result?.success && !signature && <><Button size="lg" disabled={pending} onClick={() => void signWithdrawal()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{pending ? step : percent === 100 ? t("Firmar liquidación a USDC") : t("Firmar retiro del {p}%", { p: String(percent) })}</Button><p className="text-center text-xs text-muted-foreground">{percent === 100 ? t("Al firmar cierras la posición; no se puede revertir.") : t("Al firmar retiras esta parte; no se puede revertir.")}</p></>}
    {!canSign && <p role="note" className="text-xs leading-5 text-muted-foreground">{t("Conecta la wallet propietaria para firmar esta liquidación. No hay movimientos hasta que firmes.")}</p>}
    {message && <p role="alert" className="text-sm">{message}</p>}
    {signature && <Link to="/wallet" onClick={onClose} className="text-xs underline">{t("Ver en tu wallet")}</Link>}
    </>}
  </DialogContent></Dialog>;
}
