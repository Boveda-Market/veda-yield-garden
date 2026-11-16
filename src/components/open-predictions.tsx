import { useCallback, useState } from "react";
import { notify } from "@/lib/notify";
import { useQueryClient } from "@tanstack/react-query";
import { usePredictPositions } from "@/lib/predict-positions-query";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import type { PredictPosition } from "@/lib/predict";
import { executePredict, preparePredictSell } from "@/lib/predict.functions";
import { annotateRecord } from "@/lib/predict-history";
import { buildSwap, JUPUSD_MINT, quoteSwap, readTokenBalance } from "@/lib/wallet-actions";
import { PredictPositionCard, usdcText, LivePositionStats, useStrike, roundSeconds, usePositionOdds } from "@/components/predict-position-card";
import { useLivePrice } from "@/hooks/use-live-price";
import type { MarketId } from "@/lib/markets";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { TokenIcon } from "@/components/token-icon";
import { assetOfTitle } from "@/lib/predict";
import { useEffect } from "react";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { ActionSuccess } from "@/components/action-success";
import { ProgressSteps, WorkingLine } from "@/components/move-steps";

const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));

/** Open Sube/Baja rounds for the connected wallet, with a direct "Cerrar ahora". */
export function useOpenPredictions() {
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const qc = useQueryClient();
  const q = usePredictPositions(wallet);
  // A position being closed stays listed until its window closes, so a refresh never unmounts the receipt.
  const [held, setHeld] = useState<PredictPosition | null>(null);
  const open = (q.data ?? []).filter((p) => p.status === "open");
  const items = held && !open.some((p) => p.pubkey === held.pubkey) ? [...open, held] : open;
  const refresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ["predict-positions", wallet] }); }, [qc, wallet]);
  return { items, refresh, session, wallet, setHeld };
}

export function OpenPredictions({ state }: { state: ReturnType<typeof useOpenPredictions> }) {
  const t = useT();
  const { items, refresh, session, wallet, setHeld } = state;
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Early close sells at the live market price, which can be far below the position's reference value:
  // show what the bids pay right now and sell only after the user confirms that amount.
  const [review, setReview] = useState<{ p: PredictPosition; tx: string; context: string; estimateMicro: string | null; at: number } | null>(null);
  // After "Confirmar venta" the same window shows progress (2 approvals) and ends on the receipt.
  const [flow, setFlow] = useState<{ phase: 1 | 2; text: string; error?: string; receipt?: { amount: string; sig: string | null; partial?: boolean } } | null>(null);
  const sell = async (p: PredictPosition) => {
    if (!wallet) return; setBusy(p.pubkey); setMsg(null);
    try {
      const r = await preparePredictSell({ data: { wallet, position: p.pubkey } });
      if (!r.success) throw new Error(r.error);
      setReview({ p, tx: r.transaction, context: r.context, estimateMicro: r.estimateMicro ?? null, at: Date.now() });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  const confirmSell = async () => {
    if (!wallet || !review) return;
    const { p } = review;
    let { tx, context, estimateMicro } = review;
    setHeld(p); setBusy(p.pubkey); setMsg(null); setFlow({ phase: 1, text: t("Aprueba en tu billetera (1 de 2)…") });
    try {
      if (!session.signOnly) throw new Error(t("Tu wallet no admite esta operación."));
      // The prepared sale expires quickly: rebuild it when the user took a while to decide.
      if (Date.now() - review.at > 30_000) {
        const r = await preparePredictSell({ data: { wallet, position: p.pubkey } });
        if (!r.success) throw new Error(r.error);
        ({ transaction: tx, context } = r); estimateMicro = r.estimateMicro ?? estimateMicro;
      }
      const before = await readTokenBalance(wallet, JUPUSD_MINT).catch(() => 0n);
      const signed = await session.signOnly(fromB64(tx));
      setFlow({ phase: 1, text: t("Cerrando tu posición…") });
      const x = await executePredict({ data: { wallet, signed: toB64(signed), context } });
      if (!x.success) throw new Error(x.error);
      annotateRecord(wallet, p.pubkey, { soldMicro: estimateMicro ?? p.valueMicro ?? "0", sellSig: x.signature });
      setFlow({ phase: 2, text: t("Posición cerrada. Preparando el paso a dólares…") });
      // Closing early is free: convert only the JupUSD received from this sale to USDC (no BÓVEDA fee).
      try {
        let got = 0n;
        for (let i = 0; i < 4 && got <= 0n; i++) { await new Promise((res) => setTimeout(res, 2000)); got = (await readTokenBalance(wallet, JUPUSD_MINT)) - before; }
        if (got > 0n) { const q = await quoteSwap("JupUSD", "USDC", got, { feeUsdc: 0n }); setFlow({ phase: 2, text: t("Aprueba en tu billetera (2 de 2)…") }); const s = await session.signAndSend(await buildSwap(wallet, q)); setFlow({ phase: 2, text: "", receipt: { amount: usdcText(q.outAmount), sig: s } }); notify("success", t("Posición cerrada"), t("${v} en tu billetera", { v: usdcText(q.outAmount) })); }
        else setFlow({ phase: 2, text: "", receipt: { amount: usdcText(estimateMicro ?? p.valueMicro ?? "0"), sig: x.signature } });
      } catch { setFlow({ phase: 2, text: "", receipt: { amount: usdcText(estimateMicro ?? p.valueMicro ?? "0"), sig: x.signature, partial: true } }); }
      setReview(null);
      setTimeout(() => void refresh(), 3000);
    } catch (e) { setFlow({ phase: 1, text: "", error: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  const closeSheet = () => { if (busy) return; setReview(null); setFlow(null); setHeld(null); };
  if (items.length === 0) return <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">{t("No tienes predicciones abiertas ahora mismo.")}</p>;
  return <div className="space-y-3">
    {msg && <p role="status" className={`text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text}</p>}
    <div className="grid gap-4 md:grid-cols-2">{items.map((p) => <PredictPositionCard key={p.pubkey} p={p} onSell={() => void sell(p)} selling={busy === p.pubkey} disabled={!!busy} />)}</div>
    <SellReview review={review} flow={flow} onCancel={closeSheet} onConfirm={() => void confirmSell()} />
  </div>;
}

/** Mi Billetera: open Sube/Baja rounds; renders nothing when there are none. */
export function WalletOpenPredictions() {
  const t = useT();
  const state = useOpenPredictions();
  if (state.items.length === 0) return null;
  return <section aria-label={t("Predicciones abiertas")} className="rounded-2xl border border-border bg-card p-4">
    <h3 className="mb-3 font-display text-lg">{t("Predicciones abiertas")}</h3>
    <OpenPredictions state={state} />
  </section>;
}

type SellFlow = { phase: 1 | 2; text: string; error?: string; receipt?: { amount: string; sig: string | null; partial?: boolean } } | null;
function SellReview({ review, flow, onCancel, onConfirm }: { review: { p: PredictPosition; estimateMicro: string | null } | null; flow: SellFlow; onCancel: () => void; onConfirm: () => void }) {
  const t = useT();
  const est = review?.estimateMicro ? BigInt(review.estimateMicro) : null;
  const cost = review ? BigInt(review.p.costMicro || "0") : 0n;
  return <Dialog open={!!review || !!flow} onOpenChange={(o) => { if (!o) onCancel(); }}>
    <ActionSheetContent closeLabel={t("Cerrar")} className="sm:max-w-sm">
      {flow?.receipt ? <ActionSuccess destination="/wallet" title={t("¡Posición cerrada!")} amount={{ value: flow.receipt.amount, unit: "$", label: "≈" }}
        body={flow.receipt.partial ? t("Ya vendiste, pero falta pasarlo a dólares. Hazlo en Mi Billetera → Cambiar.") : t("Ya está en tus dólares disponibles.")}
        details={[{ label: t("Operación"), value: t("Cierre antes de tiempo") }, { label: t("Comisión"), value: "$0.00" }]} signature={flow.receipt.sig} onClose={onCancel} />
      : flow ? <>
        <DialogTitle className="pr-10 font-display text-xl">{t("Cerrar antes de tiempo")}</DialogTitle>
        <DialogDescription>{est !== null ? t("Recibes aprox. ${v}", { v: usdcText(est) }) : t("Vendes al precio que el mercado paga en este momento.")}</DialogDescription>
        <ProgressSteps steps={[t("Cerrar posición"), t("Pasar a dólares")]} current={flow.phase} />
        {flow.error ? <><p role="alert" className="text-sm text-destructive">{flow.error}</p>{review && <Button size="lg" onClick={onConfirm}>{t("Intentar de nuevo")}</Button>}<Button variant="ghost" onClick={onCancel}>{t("Cerrar")}</Button></> : <WorkingLine text={flow.text} />}
      </> : <>
      <DialogHeader className="pr-10 text-left">
        <DialogTitle className="font-display text-xl">{t("Cerrar antes de tiempo")}</DialogTitle>
        <DialogDescription>{t("Vendes al precio que el mercado paga en este momento.")}</DialogDescription>
      </DialogHeader>
      <div className="rounded-xl bg-secondary/50 p-4 text-center">
        <p className="text-xs text-muted-foreground">{t("Recibes aprox.")}</p>
        <p className="font-display text-3xl font-semibold tabular-nums">{est !== null ? `$${usdcText(est)}` : "—"}</p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">{t("Invertido")}: ${usdcText(cost)}</p>
      </div>
      {est === null
        ? <p className="text-sm text-destructive">{t("Ahora mismo no hay suficientes compradores: podrías recibir mucho menos. Si esperas al final de la ronda y aciertas, cobras el premio completo.")}</p>
        : est < cost ? <p className="text-sm text-muted-foreground">{t("Recibirías menos de lo que invertiste. Si esperas al final de la ronda y aciertas, cobras el premio completo.")}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCancel}>{t("Mejor espero")}</Button>
        <Button onClick={onConfirm}>{t("Confirmar venta")}</Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">{t("Tu billetera te pedirá 2 aprobaciones seguidas.")}</p>
      </>}
    </ActionSheetContent>
  </Dialog>;
}

function Countdown({ close }: { close: number | null }) {
  const t = useT(); const [n, setN] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setN(Date.now()), 1000); return () => clearInterval(id); }, []);
  const left = close ? close * 1000 - n : 0;
  return <span className="tabular-nums">{left > 0 ? `⏱ ${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, "0")}` : t("Resolviendo…")}</span>;
}

/** Sube y Baja: compact open-round rows with a link to the full card (with live chart) in Ganancias. */
export function CompactOpenPredictions() {
  const t = useT();
  const { items } = useOpenPredictions();
  if (items.length === 0) return null;
  return <section aria-label={t("Predicciones abiertas")} className="space-y-2">
    {items.map((p) => { const a = assetOfTitle(p.title); const Up = p.side === "up"; return (
      <div key={p.pubkey} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
        {a && <TokenIcon symbol={a} size={24} />}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">{a ?? "—"}<span className={`inline-flex items-center rounded-full px-1.5 text-[11px] font-bold ${Up ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{Up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{t(Up ? "Sube" : "Baja")}</span></p>
          <p className="text-xs text-muted-foreground"><Countdown close={p.closeTime} /> · {t("Premio")} <span className="font-semibold text-primary tabular-nums">${usdcText(p.payoutMicro)}</span></p>
          <CompactLive p={p} />
        </div>
        <Link to="/portfolio" className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">{t("Ver posición")}<ChevronRight size={14} /></Link>
      </div>); })}
  </section>;
}

function CompactLive({ p }: { p: PredictPosition }) {
  const a = assetOfTitle(p.title) as MarketId | null;
  const live = useLivePrice(a);
  const dur = roundSeconds(p.title);
  const strike = useStrike(a, p.closeTime, dur);
  const odds = usePositionOdds(p);
  return <LivePositionStats p={p} price={live.price} strike={strike} odds={odds} compact />;
}
