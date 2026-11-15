import { ServiceFeeLabel } from "@/components/service-fee-label";
import { vaultSymbol, type OperableVault } from "@/lib/solana-data";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ReceiptText, LoaderCircle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { MoveSteps } from "@/components/move-steps";
import { simulateRealWithdrawal, prepareRealWithdrawal } from "@/lib/withdrawal.functions";
import { exitInput, EXIT_PERCENTS, type WithdrawalResult } from "@/lib/withdrawal";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import type { Vault } from "@/lib/vaults";
import { ActionSuccess, ReceiveCard } from "@/components/action-success";
import { notify } from "@/lib/notify";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { sweepLeftovers, leftoverSymbols } from "@/lib/sweep-leftovers";

export function WithdrawalSimulation({ wallet, position, vaultId, onClose, migrateTo, rotate = false, onMigrated }: { wallet: string | null; position?: string; vaultId: OperableVault; onClose: () => void; migrateTo?: Vault; rotate?: boolean; onMigrated?: (usdc: string) => void }) {
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
  // Migration: chain step 2 automatically as soon as the exit is confirmed.
  useEffect(() => { if (finished && migrateTo && onMigrated) onMigrated(result?.minimumNet ?? ""); }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sweepNote, setSweepNote] = useState<string | null>(null);
  const [leftovers, setLeftovers] = useState<string[]>([]);
  useEffect(() => { if (!migrateTo && address && result?.success) void leftoverSymbols(address).then(setLeftovers).catch(() => setLeftovers([])); }, [address, result?.success, migrateTo]);
  const two = !migrateTo && leftovers.length > 0;
  const input = exitInput.safeParse({ wallet: address, position: positionAddress, vaultId, percent, ...(migrateTo ? { migrate: true } : {}), ...(migrateTo && rotate ? { rotate: true } : {}) });
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
      setStep(two ? t("Firma 1 de 2: esperando firma en tu wallet…") : t("Esperando firma en tu wallet…"));
      let sig: string;
      try { sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0))); }
      catch { setMessage(t("La wallet canceló o rechazó la solicitud. Si pudo enviarse, revisa su historial antes de reintentar.")); return; }
      setSignature(sig); notify("secure", t("Firma aprobada"), t("Confirmando en la red…")); setStep(two ? t("Firma 1 de 2 enviada: confirmando tu retiro en la red…") : t("Esperando confirmación en la red…"));
      for (let attempt = 0; attempt < 60; attempt++) {
        const status = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
        if (status.status === "failed") { setMessage(t("La red rechazó la transacción atómica: no se aplicaron el retiro ni la comisión; puede cobrarse el coste de red.")); return; }
        if (status.status !== "pending") {
          if (!migrateTo) void reportAffiliate(sig, "exit");
          // Convert leftover JupUSD / vault tokens to USDC too (free swaps, one signature each). The SOL network reserve stays.
          if (!migrateTo) {
            try {
              const swept = await sweepLeftovers(address, session.signAndSend, (symbol, i, n) => setStep(t("Firma 1 de 2 lista: tu retiro ya está en tu wallet. Ahora firma la 2 de 2 para cambiar tus sobrantes de {s} a USDC ({i} de {n})…", { s: symbol, i: String(i), n: String(n) })));
              if (swept.failed.length) setSweepNote(t("Tu retiro de la bóveda ya está en tu wallet. El cambio de sobrantes ({s}) no se completó; puedes hacerlo cuando quieras en Mi Billetera → Cambiar.", { s: swept.failed.join(", ") }));
              else if (swept.converted > 0) setSweepNote(t("También cambiamos tus sobrantes a USDC: ~{v} USDC más, sin comisión.", { v: (Number(swept.usdc) / 1e6).toFixed(2) }));
            } catch { setSweepNote(t("No se pudieron cambiar los sobrantes. Hazlo en Mi Billetera → Cambiar.")); }
          }
          notify("success", t("Retiro confirmado"), t("Tus USDC ya están en tu billetera"));
          setFinished(true); setMessage(t("Liquidación confirmada en la red. Consulta los importes finales y la renta devuelta en Helius."));
          for (const k of ["real-solana", "meteora-history", "my-wallet", "my-wallet-tokens", "start-guide"]) await queryClient.invalidateQueries({ queryKey: [k, address] });
          return;
        }
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
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><ActionSheetContent closeLabel={t("Cerrar")}>
    <DialogTitle>{migrateTo ? t("Migrar a {v}", { v: t(migrateTo.name) }) : <>{t("Retirar ·")}{" "}{vaultSymbol(vaultId)}</>}</DialogTitle>
    <DialogDescription>{migrateTo ? t("Movemos todo tu dinero y ganancias. 0% de comisión.") : t("Elige cuánto retirar a tus dólares disponibles.")}</DialogDescription>
    {!migrateTo && !finished && !signature && <div role="radiogroup" aria-label={t("Cuánto retirar")} className="grid grid-cols-4 gap-2">{EXIT_PERCENTS.map((p) => <Button key={p} type="button" role="radio" aria-checked={percent === p} variant={percent === p ? "default" : "outline"} disabled={pending} onClick={() => { setPercent(p); setResult(null); setAccepted(false); setMessage(null); }}>{p === 100 ? t("Todo") : `${p}%`}</Button>)}</div>}
    {!migrateTo && !finished && !signature && percent !== 100 && <p className="text-xs text-muted-foreground">{t("Retiras el {p}% y el resto sigue invirtiendo en la bóveda.", { p: String(percent) })}</p>}
    {migrateTo && <MoveSteps current={finished ? 2 : 1} from={vaultSymbol(vaultId)} to={t(migrateTo.name)} />}
    {finished && migrateTo && onMigrated ? <div role="status" className="grid gap-3"><p className="flex items-center gap-2 font-semibold"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />{t("Cierre listo. Abriendo tu nueva bóveda…")}</p><Button size="lg" onClick={() => onMigrated(result?.minimumNet ?? "")}>{t("Paso 2: depositar en {v}", { v: t(migrateTo.name) })}</Button></div> : finished ? <><p role="status" className="sr-only">{message}</p><ActionSuccess destination="/wallet" title={t("¡Retiro completado!")} amount={result?.net ? { value: result.net, unit: "USDC", label: "≈" } : undefined} details={[{ label: t("Operación"), value: percent === 100 ? t("Retiro total de bóveda") : t("Retiro del {p}% de bóveda", { p: String(percent) }) }, { label: t("Origen"), value: t("Bóveda {v}", { v: vaultSymbol(vaultId) }) }, { label: t("Destino"), value: t("Tu billetera") }, ...(percent === 100 && result?.rentSol ? [{ label: t("Garantía de red devuelta"), value: `+${result.rentSol} SOL` }] : [])]} body={percent === 100 ? t("Tus USDC ya están en tu wallet. También recuperaste el SOL de apertura de la posición.") : t("Tus USDC ya están en tu wallet. El resto de tu posición sigue invertido.")} signature={signature} onClose={onClose} />{sweepNote && <p role="status" className="text-sm text-muted-foreground">{sweepNote}</p>}</> : <>
    {!prefilled && inputs}
    {(!result || !result.success) && <Button variant={result ? "outline" : "default"} disabled={pending || !input.success} onClick={() => void run()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ReceiptText className="mr-2 h-4 w-4" />}{pending ? t("Calculando tu retiro…") : t("Revisar retiro")}</Button>}
    {result && <div role="status" className="grid gap-3 text-sm">
      {!result.success && <><p className="font-semibold">{t("Retiro no disponible")}</p><p className="leading-6 text-muted-foreground">{result.message}</p></>}
      {result.gross && <>
        <ReceiveCard label={migrateTo ? t("Moverás aproximadamente") : t("Recibes aproximadamente")} amount={result.net ?? "—"} unit="$" sub={result.minimumNet ? `${t("Mínimo garantizado:")} $${result.minimumNet}` : undefined} />
        <dl className="grid gap-2 rounded-xl border border-border p-4">
          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Valor de tu posición")}</dt><dd>${result.gross}</dd></div>
          <div className="flex justify-between gap-3"><dt><ServiceFeeLabel t={t} /></dt><dd>{migrateTo ? t("Gratis") : `−$${result.fee}`}</dd></div>
                  </dl>
      </>}
    </div>}
    {result && !result.success && result.remainingTokenRaw && result.remainingTokenRaw !== "0" && <p role="alert" className="text-xs leading-5 text-destructive">{t("Diferencia de tokens tras la conversión:")}{" "}{result.remainingTokenRaw} {t("unidades mínimas. No es un importe en USD; la liquidación no está validada.")}</p>}
    {canSign && result?.success && !signature && <><Button size="lg" disabled={pending} onClick={() => void signWithdrawal()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{pending ? step : migrateTo ? t("Confirmar migración") : two ? t("Confirmar retiro (2 aprobaciones)") : t("Confirmar retiro")}</Button><p className="text-center text-xs text-muted-foreground">{migrateTo ? t("Tu billetera te pedirá 2 aprobaciones seguidas.") : t("Los dólares llegan a tu billetera en segundos.")}</p></>}
    {!canSign && <p role="note" className="text-xs leading-5 text-muted-foreground">{t("Conecta la wallet propietaria para firmar esta liquidación. No hay movimientos hasta que firmes.")}</p>}
    {signature && pending && step && <p role="status" className="flex items-center gap-2 text-sm"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />{step}</p>}
    {message && <p role="alert" className="text-sm">{message}</p>}
    {signature && <Link to="/wallet" onClick={onClose} className="text-xs underline">{t("Ver en tu wallet")}</Link>}
    </>}
  </ActionSheetContent></Dialog>;
}
