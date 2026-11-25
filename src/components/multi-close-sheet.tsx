import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { WorkingLine } from "@/components/move-steps";
import { SignalErrorCard } from "@/components/signal-error";
import { ActionSuccess } from "@/components/action-success";
import { FundsKeptCard } from "@/components/funds-kept-card";
import { simulateRealWithdrawal, prepareRealWithdrawal } from "@/lib/withdrawal.functions";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";
import type { WithdrawalResult } from "@/lib/withdrawal";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { sweepLeftovers } from "@/lib/sweep-leftovers";
import { vaultSymbol, type OperableVault } from "@/lib/solana-data";
import { VAULTS } from "@/lib/vaults";
import { useT } from "@/lib/i18n";
import { sumUsd } from "@/lib/multi-close";

export type ClosablePosition = { position: string; vaultId: OperableVault };
type Row = ClosablePosition & { quote?: WithdrawalResult; status: "idle" | "working" | "done" | "failed"; net?: string | undefined; error?: string };

/** Close several vaults to dollars: pick with checkboxes, one confirm, then each closes in sequence (one approval each, chained automatically). */
export function MultiCloseSheet({ wallet, positions, onClose }: { wallet: string; positions: ClosablePosition[]; onClose: () => void }) {
  const t = useT();
  const simulate = useServerFn(simulateRealWithdrawal);
  const prepare = useServerFn(prepareRealWithdrawal);
  const readStatus = useServerFn(pilotDepositStatus);
  const reportAffiliate = useAffiliateReport();
  const session = useBovedaSession();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() => positions.map((p) => ({ ...p, status: "idle" })));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(positions.map((p) => p.position)));
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState("");
  const [finished, setFinished] = useState(false);
  const [kept, setKept] = useState(false);
  const [lastSig, setLastSig] = useState<string | null>(null);
  const started = useRef(false);
  const patch = (pos: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => r.position === pos ? { ...r, ...p } : r));
  const name = (id: OperableVault) => t(VAULTS.find((v) => v.id === id)?.name ?? vaultSymbol(id));

  // Quotes load on open, all in parallel.
  useEffect(() => {
    for (const p of positions) void simulate({ data: { wallet, position: p.position, vaultId: p.vaultId, percent: 100 } })
      .then((q) => patch(p.position, { quote: q }))
      .catch(() => patch(p.position, { quote: { success: false, sent: false, message: t("No se pudo consultar el retiro. No se firmó ni envió nada.") } }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = rows.filter((r) => picked.has(r.position));
  const quotesReady = chosen.length > 0 && chosen.every((r) => r.quote);
  const closable = chosen.filter((r) => r.quote?.success);
  const total = sumUsd(closable.map((r) => r.quote?.net));
  const received = sumUsd(rows.filter((r) => r.status === "done").map((r) => r.net));
  const canSign = session.authenticated && session.walletAddress === wallet;

  async function closeOne(r: Row): Promise<string | null> {
    const q = r.quote;
    if (!q?.feeRaw || !q.minimumNetRaw) return null;
    const input = { wallet, position: r.position, vaultId: r.vaultId, percent: 100 };
    let next = await prepare({ data: { ...input, maximumFeeRaw: q.feeRaw, minimumNetRaw: q.minimumNetRaw } });
    if (!next.success && next.message.includes("cotización cambió")) {
      // Price moved: refresh once and retry with the new reviewed minimum.
      const fresh = await simulate({ data: input });
      if (!fresh.success || !fresh.feeRaw || !fresh.minimumNetRaw) throw new Error(fresh.message);
      patch(r.position, { quote: fresh });
      next = await prepare({ data: { ...input, maximumFeeRaw: fresh.feeRaw, minimumNetRaw: fresh.minimumNetRaw } });
    }
    if (!next.success || !next.prepared || next.prepared.wallet !== wallet || next.prepared.position !== r.position || next.prepared.expiresAt <= Date.now()) throw new Error(next.message || t("No se pudo preparar el retiro. No se movió dinero."));
    const sig = await session.signAndSend(Uint8Array.from(atob(next.prepared.transaction), (c) => c.charCodeAt(0)));
    for (let attempt = 0; attempt < 60; attempt++) {
      const s = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
      if (s.status === "failed") throw new Error(t("La red rechazó el retiro. No se cobró comisión y tu dinero sigue en la bóveda."));
      if (s.status !== "pending") {
        void reportAffiliate(sig, "exit", { percent: 100, amountUsd: next.net?.replace(/,/g, ""), vault: vaultSymbol(r.vaultId) });
        patch(r.position, { status: "done", net: next.net ?? q.net });
        return sig;
      }
      await new Promise((res) => setTimeout(res, attempt < 10 ? 800 : 2_000));
    }
    throw new Error(t("La confirmación tarda más de lo habitual. Revisa tu billetera antes de intentarlo otra vez."));
  }

  async function runAll() {
    if (started.current || !canSign || closable.length === 0) return;
    started.current = true; setRunning(true);
    let any = false;
    for (const [i, r] of closable.entries()) {
      setStep(t("Cerrando {v} ({n} de {m})…", { v: name(r.vaultId), n: String(i + 1), m: String(closable.length) }));
      patch(r.position, { status: "working" });
      try { const sig = await closeOne(r); if (sig) { any = true; setLastSig(sig); } }
      catch (e) { patch(r.position, { status: "failed", error: e instanceof Error ? e.message : t("No se pudo cerrar.") }); }
    }
    if (any) {
      setStep(t("Pasando todo a dólares…"));
      try { await sweepLeftovers(wallet, session.signAndSend); } catch { /* leftovers stay in the wallet */ }
      for (const k of ["real-solana", "meteora-history", "my-wallet", "my-wallet-tokens", "start-guide"]) await queryClient.invalidateQueries({ queryKey: [k, wallet] });
    }
    setStep(""); setRunning(false); setFinished(true);
  }

  const done = rows.filter((r) => r.status === "done");
  const failed = rows.filter((r) => r.status === "failed");
  return <Dialog open onOpenChange={(open) => { if (open || running) return; if (quotesReady && closable.length > 0 && !started.current && !kept) setKept(true); else onClose(); }}><ActionSheetContent closeLabel={t("Cerrar")}>
    {kept ? <FundsKeptCard where="vault" onDone={onClose} /> : finished && done.length > 0 ? <>
      <DialogTitle className="sr-only">{t("Bóvedas cerradas")}</DialogTitle>
      <ActionSuccess destination="/wallet" title={failed.length ? t("{n} de {m} bóvedas cerradas", { n: String(done.length), m: String(done.length + failed.length) }) : t("¡Tus dólares están en tu billetera!")} amount={{ value: received, unit: "$", label: "≈" }}
        details={[...done.map((r) => ({ label: name(r.vaultId), value: `+$${r.net ?? "—"}` })), ...failed.map((r) => ({ label: name(r.vaultId), value: t("Sigue abierta") })), { label: t("Garantía de apertura"), value: t("Devuelta") }]}
        body={failed.length ? t("Las que no se pudieron cerrar siguen invirtiendo; puedes intentarlo de nuevo.") : t("Cerramos tus bóvedas y recuperaste la garantía de apertura.")} signature={lastSig} onClose={onClose} />
    </> : <>
      <DialogTitle>{t("Cerrar bóvedas")}</DialogTitle>
      <DialogDescription>{t("Elige cuáles pasar a dólares. Confirmas una vez y las cerramos una tras otra.")}</DialogDescription>
      {!running && !finished && <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" className="size-5 accent-primary" checked={picked.size === rows.length} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r.position)) : new Set())} />{t("Seleccionar todas")}</label>}
      <ul className="grid gap-2">{rows.map((r) => {
        const on = picked.has(r.position);
        return <li key={r.position}><label className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${on ? "border-primary bg-primary/10" : "border-border"}`}>
          {r.status === "done" ? <Check className="size-5 text-primary" /> : r.status === "failed" ? <X className="size-5 text-destructive" /> : r.status === "working" ? <LoaderCircle className="size-5 animate-spin text-primary motion-reduce:animate-none" /> :
            <input type="checkbox" className="size-5 accent-primary" disabled={running || finished} checked={on} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(r.position); else n.delete(r.position); return n; })} />}
          <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{name(r.vaultId)}</span>{r.error ? <span className="block text-xs text-destructive">{r.error}</span> : r.quote && !r.quote.success ? <span className="block text-xs text-muted-foreground">{t("No disponible ahora")}</span> : null}</span>
          <span className="tabular-nums font-semibold">{!r.quote ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" /> : r.quote.success ? `≈ $${r.net ?? r.quote.net ?? "—"}` : "—"}</span>
        </label></li>;
      })}</ul>
      {!finished && <div className="flex items-baseline justify-between rounded-xl bg-muted p-3"><span className="text-sm text-muted-foreground">{t("Recibes aproximadamente")}</span><span className="font-display text-2xl font-bold tabular-nums">{quotesReady ? `$${total}` : "…"}</span></div>}
      {!finished && <p className="text-xs text-muted-foreground">{t("Ya incluye la comisión del servicio. También recuperas la garantía de apertura de cada bóveda.")}</p>}
      {running && step && <WorkingLine text={step} />}
      {finished && done.length === 0 && <SignalErrorCard message={t("No se cerró ninguna bóveda. Tu dinero sigue invirtiendo.")} />}
      {!canSign && <p role="note" className="text-xs text-muted-foreground">{t("Conecta la wallet propietaria para firmar esta liquidación. No hay movimientos hasta que firmes.")}</p>}
      {!finished && <Button size="lg" className="sheet-action" disabled={!canSign || !quotesReady || closable.length === 0 || running} onClick={() => void runAll()}>{running ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <PenLine className="mr-2 h-4 w-4" />}{running ? t("Cerrando…") : closable.length === 1 ? t("Cerrar 1 bóveda y recibir ~${a}", { a: total }) : t("Cerrar {n} bóvedas y recibir ~${a}", { n: String(closable.length), a: total })}</Button>}
      {!running && <Button variant="ghost" onClick={() => finished ? onClose() : quotesReady && closable.length > 0 ? setKept(true) : onClose()}>{finished ? t("Listo") : t("Cancelar")}</Button>}
    </>}
  </ActionSheetContent></Dialog>;
}
