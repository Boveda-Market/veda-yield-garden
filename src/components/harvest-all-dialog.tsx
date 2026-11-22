import { useEffect, useState } from "react";
import { FundsKeptCard } from "@/components/funds-kept-card";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { ActionSuccess, ReceiveCard } from "@/components/action-success";
import { WorkingLine } from "@/components/move-steps";
import { SignalErrorCard } from "@/components/signal-error";
import { simulateRealHarvest, prepareRealHarvest } from "@/lib/harvest.functions";
import { harvestedToUsdc, type HarvestResult } from "@/lib/harvest";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";
import { prepareGasRefill } from "@/lib/gas-refill.functions";
import { vaultSymbol, type OperableVault } from "@/lib/solana-data";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { useT } from "@/lib/i18n";

export type HarvestTarget = { position: string; vaultId: OperableVault };
type Quote = HarvestTarget & { r: HarvestResult };

/** «Cosechar todo»: quotes every open vault, then one tap harvests them all in sequence (each tx simulated, wallet-signed, confirmed). */
export function HarvestAllDialog({ wallet, targets, onClose }: { wallet: string; targets: HarvestTarget[]; onClose: () => void }) {
  const t = useT();
  const simulate = useServerFn(simulateRealHarvest);
  const prepare = useServerFn(prepareRealHarvest);
  const readStatus = useServerFn(pilotDepositStatus);
  const refill = useServerFn(prepareGasRefill);
  const report = useAffiliateReport();
  const session = useBovedaSession();
  const qc = useQueryClient();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [step, setStep] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ total: number; sigs: string[]; failed: string[]; refillMicro: bigint } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kept, setKept] = useState(false);
  useEffect(() => {
    void Promise.all(targets.map(async (x) => ({ ...x, r: await simulate({ data: { wallet, ...x } }).catch(() => ({ success: false, sent: false, message: "" }) as HarvestResult) }))).then(setQuotes);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const ok = (quotes ?? []).filter((q) => q.r.success && q.r.feeRaw !== undefined);
  const net = ok.reduce((s, q) => s + Number(q.r.net ?? 0), 0);
  const canSign = session.authenticated && session.walletAddress === wallet;
  async function confirmOne(sig: string) {
    for (let i = 0; i < 30; i++) { const s = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const })); if (s.status === "failed") return false; if (s.status !== "pending") return true; await new Promise((r) => setTimeout(r, 2000)); }
    return false;
  }
  async function run() {
    if (busy || !canSign) return;
    setBusy(true); setError(null);
    let total = 0; const sigs: string[] = [], failed: string[] = [];
    // Low network reserve: top it up from the treasury first (paid in dollars, same tap), so the harvest never stalls.
    let refillMicro = 0n;
    setStep(t("Asegurando reserva de operaciones…"));
    try {
      const r = await refill({ data: { wallet } });
      if (r.success && r.transaction) {
        const rs = await session.signAndSend(Uint8Array.from(atob(r.transaction), (c) => c.charCodeAt(0)));
        if (!(await confirmOne(rs))) throw new Error("refill");
        refillMicro = BigInt(r.chargeMicro);
      } else if (!r.success && !/ya está bien/.test(r.error)) throw new Error(r.error);
    } catch (e) { setError(e instanceof Error && e.message !== "refill" ? t(e.message) : t("No se pudo recargar la reserva de operaciones. No se movió dinero.")); setBusy(false); setStep(""); return; }
    for (const [i, q] of ok.entries()) {
      const coin = vaultSymbol(q.vaultId);
      setStep(t("Cosechando {v} ({i}/{n})…", { v: coin, i: i + 1, n: ok.length }));
      try {
        const next = await prepare({ data: { wallet, position: q.position, vaultId: q.vaultId, maximumFeeRaw: q.r.feeRaw! } });
        if (!next.success || !next.prepared || next.prepared.position !== q.position) { failed.push(coin); continue; }
        const sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0)));
        if (!(await confirmOne(sig))) { failed.push(coin); continue; }
        sigs.push(sig); total += Number(next.net ?? 0);
        void report(sig, "harvest", { ...(next.net ? { amountUsd: String(Number(String(next.net).replace(/,/g, ""))) } : {}), vault: coin });
        if (next.tokenRaw && BigInt(next.tokenRaw) > 0n && next.tokenSymbol) {
          try { total += Number(await harvestedToUsdc(wallet, next.tokenSymbol, BigInt(next.tokenRaw), session.signAndSend)) / 1e6; } catch { /* stays as token */ }
        }
      } catch { failed.push(coin); if (!sigs.length && i === 0) { setError(t("Cancelaste la aprobación. No se movió dinero.")); setBusy(false); setStep(""); return; } }
    }
    await qc.invalidateQueries({ queryKey: ["real-solana", wallet] }); await qc.invalidateQueries({ queryKey: ["meteora-history", wallet] });
    if (sigs.length) { setDone({ total, sigs, failed, refillMicro }); }
    else setError(t("No se pudo completar la cosecha. No se movió dinero."));
    setBusy(false); setStep("");
  }
  return <Dialog open onOpenChange={(o) => { if (o || busy) return; if (ok.length > 0 && !done && !kept) setKept(true); else onClose(); }}><ActionSheetContent closeLabel={t("Cerrar")}>
    {kept ? <FundsKeptCard where="earnings" onDone={onClose} /> : <>
    <DialogTitle className={done ? "sr-only" : undefined}>{t("Cosechar todo")}</DialogTitle>
    <DialogDescription className={done ? "sr-only" : undefined}>{t("Cobra las ganancias de todas las bóvedas abiertas a la vez. Los depósitos siguen generando.")}</DialogDescription>
    {done ? <><ActionSuccess title={t("¡Ganancias cosechadas!")} amount={{ value: done.total.toFixed(2), unit: "$", label: "≈" }} details={[{ label: t("Operación"), value: t("Cosecha de todas las bóvedas") }, { label: t("Bóvedas"), value: String(done.sigs.length) }, { label: t("Destino"), value: t("Billetera") }, ...(done.refillMicro > 0n ? [{ label: t("Recarga de reserva de operaciones"), value: `$${(Number(done.refillMicro) / 1e6).toFixed(2)}` }] : [])]} body={t("Las ganancias ya están en la billetera y los depósitos siguen generando.")} signature={done.sigs[done.sigs.length - 1] ?? null} onClose={onClose} />{done.failed.length > 0 && <p role="status" className="text-sm text-muted-foreground">{t("No se pudo cosechar: {v}. Sus ganancias siguen en la bóveda.", { v: done.failed.join(", ") })}</p>}</> : <>
      {!quotes && <WorkingLine text={t("Calculando ganancias…")} />}
      {quotes && <>
        <ReceiveCard label={t("Recibes")} amount={net.toFixed(2)} unit="$" sub={t("+ la otra parte, convertida a dólares")} />
        <dl className="grid gap-2 rounded-xl border border-border p-4 text-sm">{quotes.map((q) => <div key={q.position} className="flex justify-between gap-3"><dt className="text-muted-foreground">{vaultSymbol(q.vaultId)}</dt><dd className="tabular-nums">{q.r.success ? `$${q.r.net}` : t("No disponible")}</dd></div>)}</dl>
      </>}
      {step && <WorkingLine text={step} />}
      {quotes && ok.length > 0 && canSign && <Button size="lg" disabled={busy} onClick={() => void run()}>{busy ? step : t("Confirmar cosecha de todo")}</Button>}
      {quotes && ok.length === 0 && <p className="text-sm text-muted-foreground">{t("No hay ganancias listas para cosechar.")}</p>}
      {error && <SignalErrorCard message={error} />}
    </>}
    </>}
  </ActionSheetContent></Dialog>;
}
