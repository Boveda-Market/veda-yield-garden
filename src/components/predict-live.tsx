import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShareWin } from "@/components/share-win";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { PREDICT_MAX_USDC, PREDICT_MIN_USDC, potentialProfit, type LiveRound, type PredictPosition, type PredictQuote, type PredictSide } from "@/lib/predict";
import { executePredict, getPredictPositions, preparePredictBuy, preparePredictSell } from "@/lib/predict.functions";
import { toBaseUnits } from "@/lib/wallet-actions";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";

const usdc = (micro: string | bigint | null) => micro === null ? "—" : (Number(micro) / 1e6).toFixed(2);
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));

/** Order ticket for the selected live Up/Down round. Wallet USDC only; BÓVEDA is never the counterparty. */
export function PredictLive({ round }: { round: LiveRound | null }) {
  const t = useT();
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const [side, setSide] = useState<PredictSide | null>(null);
  const [amount, setAmount] = useState("10");
  const [review, setReview] = useState<{ side: PredictSide; round: LiveRound; quote: PredictQuote; tx: string; context: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);
  const [positions, setPositions] = useState<PredictPosition[]>([]);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [win, setWin] = useState<string | null>(null);

  useEffect(() => { setReview(null); }, [round?.marketId]);
  const refresh = useCallback(async () => {
    if (!wallet) return;
    const r = await getPredictPositions({ data: { wallet } });
    if (r.success) setPositions(r.positions);
  }, [wallet]);
  useEffect(() => { void refresh(); const id = setInterval(refresh, 15_000); return () => clearInterval(id); }, [refresh]);
  const loadBalance = useCallback(async () => {
    if (!wallet) return;
    try { const r = await getRealWallet({ data: { wallet } }); if (r.success) setBalance(decimalToUnits(r.data.usdc, 6) ?? 0n); } catch { /* keep last */ }
  }, [wallet]);
  useEffect(() => { void loadBalance(); const id = setInterval(loadBalance, 20_000); return () => clearInterval(id); }, [loadBalance]);

  const priceOf = (s: PredictSide) => round ? (s === "up" ? round.upPrice : round.downPrice) : null;
  const selPrice = side ? priceOf(side) : null;
  const units = toBaseUnits(amount, "USDC");
  const inRange = !!units && units >= BigInt(PREDICT_MIN_USDC * 1e6) && units <= BigInt(PREDICT_MAX_USDC * 1e6);
  const short = !!units && balance !== null && units > balance;
  const valid = inRange && !short && !!round && !!side && !!selPrice;
  const maxMicro = balance === null ? null : (balance < BigInt(PREDICT_MAX_USDC * 1e6) ? balance : BigInt(PREDICT_MAX_USDC * 1e6));
  const amt = units ? Number(units) / 1e6 : 0;

  const sign = async (tx: string, context: string) => {
    if (!session.signOnly) throw new Error(t("Tu wallet no admite esta operación."));
    const signed = await session.signOnly(fromB64(tx));
    const r = await executePredict({ data: { wallet: wallet!, signed: toB64(signed), context } });
    if (!r.success) throw new Error(r.error);
    return r.signature;
  };
  const prepare = async () => {
    if (!wallet || !units || !valid || !round || !side) return;
    setBusy("prep"); setMsg(null); setReview(null);
    try {
      const r = await preparePredictBuy({ data: { wallet, marketId: round.marketId, isYes: side === "up", amount: units.toString() } });
      if (!r.success) throw new Error(r.error);
      setReview({ side, round, quote: r.quote, tx: r.transaction, context: r.context });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  const confirm = async () => {
    if (!review || !wallet) return;
    setBusy("sign");
    try {
      const sig = await sign(review.tx, review.context);
      setReview(null);
      setMsg({ ok: true, text: t("Predicción confirmada. Si aciertas, el pago llega solo a tu wallet al cerrar la ronda."), sig });
      setTimeout(() => { void refresh(); void loadBalance(); }, 3000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  const sell = async (p: PredictPosition) => {
    if (!wallet) return; setBusy(p.pubkey); setMsg(null);
    try {
      const r = await preparePredictSell({ data: { wallet, position: p.pubkey } });
      if (!r.success) throw new Error(r.error);
      const sig = await sign(r.transaction, r.context);
      const profit = p.valueMicro ? BigInt(p.valueMicro) - BigInt(p.costMicro) : 0n;
      if (profit > 0n) setWin(usdc(profit));
      setMsg({ ok: true, text: t("Venta confirmada. El USDC está en tu wallet."), sig });
      setTimeout(() => { void refresh(); void loadBalance(); }, 3000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {(["up", "down"] as const).map((s) => {
          const p = priceOf(s), on = side === s, up = s === "up";
          const Icon = up ? ArrowUpRight : ArrowDownRight;
          return <button key={s} type="button" disabled={!p} aria-pressed={on} onClick={() => { setSide(s); setReview(null); }}
            className={`relative overflow-hidden rounded-2xl border-2 p-4 text-left transition active:scale-[0.97] disabled:opacity-40 ${on ? (up ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "border-destructive bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30") : up ? "border-primary/40 bg-primary/5 text-primary" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
            <span className="flex items-center justify-between"><span className="font-display text-xl font-bold">{t(up ? "Sube" : "Baja")}</span><Icon size={22} /></span>
            <span className="mt-2 block font-display text-3xl font-bold tabular-nums">{p ? `${Math.round(p * 100)}%` : "—"}</span>
            <span className={`block text-xs font-semibold ${on ? "opacity-90" : "text-muted-foreground"}`}>{p ? t("Paga {x}×", { x: (1 / p).toFixed(2) }) : t("Sin precio")}</span>
          </button>;
        })}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4" aria-label={t("Tu orden")}>
        <div className="flex items-center justify-between"><label htmlFor="predict-amount" className="text-sm font-semibold">{t("Estás poniendo (USDC)")}</label><span className="text-xs text-muted-foreground">{t("Disponible")}: <strong className="text-foreground tabular-nums">{!wallet ? "—" : balance === null ? "…" : usdc(balance)} USDC</strong></span></div>
        <input id="predict-amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setReview(null); }} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 font-display text-xl font-bold" />
        <div className="mt-2 grid grid-cols-5 gap-2">{[5, 10, 25, 50].map((v) => <Button key={v} type="button" variant="secondary" size="sm" onClick={() => { setAmount(String(v)); setReview(null); }}>${v}</Button>)}<Button type="button" variant="outline" size="sm" disabled={!maxMicro || maxMicro <= 0n} onClick={() => { if (maxMicro) { setAmount((Math.floor(Number(maxMicro) / 1e4) / 100).toFixed(2)); setReview(null); } }}>{t("Máx")}</Button></div>
        {!inRange && <p className="mt-2 text-xs text-destructive">{t("Entre {min} y {max} USDC.", { min: PREDICT_MIN_USDC, max: PREDICT_MAX_USDC })}</p>}
        {short && <p className="mt-2 text-xs text-destructive">{t("Saldo insuficiente: tienes {v} USDC.", { v: usdc(balance) })} <Link to="/wallet" className="underline">{t("Depositar o cambiar a USDC")}</Link></p>}
        {inRange && selPrice && <div className="mt-3 space-y-1 rounded-xl bg-secondary/50 p-3 text-sm">
          <p className="flex justify-between"><span className="text-muted-foreground">{t("Pones")}</span><strong className="tabular-nums">{amt.toFixed(2)} USDC</strong></p>
          <p className="flex justify-between"><span className="text-muted-foreground">{t("Si aciertas recibes aprox.")}</span><strong className="text-primary tabular-nums">{(amt / selPrice).toFixed(2)} USDC</strong></p>
          <p className="flex justify-between"><span className="text-muted-foreground">{t("Ganancia posible")}</span><strong className="tabular-nums">+{(amt / selPrice - amt).toFixed(2)} USDC</strong></p>
        </div>}
        {!side && <p className="mt-3 text-center text-xs text-muted-foreground">{t("Elige Sube o Baja para ver tu pago.")}</p>}
        {!wallet ? <p className="mt-3 rounded-xl bg-secondary p-3 text-center text-sm font-semibold">{t("Entra con tu cuenta para predecir en vivo con el USDC de tu wallet.")}</p>
          : <Button disabled={!valid || !!busy} onClick={prepare} variant={side === "down" ? "destructive" : "default"} className="mt-3 h-12 w-full rounded-xl text-base font-bold">{busy === "prep" ? <Loader2 className="animate-spin" /> : side ? t(side === "up" ? "Predecir Sube" : "Predecir Baja") : t("Elige Sube o Baja")}</Button>}
        <p className="mt-2 text-[11px] text-muted-foreground">{t("Verás la cifra exacta antes de firmar.")}</p>
      </section>

      {review && <section className="space-y-2 rounded-2xl border-2 border-primary/50 bg-primary/5 p-4 text-sm" aria-label={t("Revisión")}>
        <p className="font-semibold">{t("Revisa tu predicción")} · {t(review.side === "up" ? "Sube" : "Baja")}</p>
        <p className="flex justify-between"><span>{t("Pagas")}</span><strong>{usdc(review.quote.costMicro)} USDC</strong></p>
        <p className="flex justify-between"><span>{t("Si aciertas recibes")}</span><strong className="text-primary">{usdc(review.quote.contractsMicro)} USDC</strong></p>
        <p className="flex justify-between"><span>{t("Ganancia posible")}</span><strong>+{usdc(potentialProfit(review.quote))} USDC</strong></p>
        <p className="text-xs text-muted-foreground">{t("Si no aciertas, pierdes lo que pagaste. Puedes vender antes de que cierre la ronda al precio del momento.")}</p>
        <Button className="w-full" disabled={busy === "sign"} onClick={confirm}>{busy === "sign" ? <Loader2 className="animate-spin" /> : t("Confirmar y firmar")}</Button>
      </section>}

      {msg && <p role="status" className={`text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}>{msg.text} {msg.sig && <a className="inline-flex items-center gap-1 underline" href={`https://orbmarkets.io/tx/${msg.sig}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}<ExternalLink size={12} /></a>}</p>}
      {win && <ShareWin headline={t("¡Acerté! +{v} USDC", { v: win })} />}

      {positions.length > 0 && <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">{t("Tus predicciones en vivo")}</h2>
        {positions.map((p) => {
          const pnl = p.pnlMicro ? BigInt(p.pnlMicro) : null;
          const open = p.status === "open";
          return <div key={p.pubkey} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm">
            <div className="min-w-0"><p className="font-semibold">{p.title}</p><p className="text-xs text-muted-foreground">{t(p.side === "up" ? "Sube" : "Baja")} · {usdc(p.costMicro)} USDC · {t("Pago si aciertas")} {usdc(p.payoutMicro)}{pnl !== null ? ` · ${pnl >= 0n ? "+" : ""}${usdc(pnl)}` : ""}{!open && p.result ? ` · ${t("Resultado")}: ${p.result}` : ""}</p>
              {open && pnl !== null && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${pnl >= 0n ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{t(pnl >= 0n ? "Va a favor" : "Va en contra")}</span>}</div>
            {open && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => sell(p)}>{busy === p.pubkey ? <Loader2 className="animate-spin" size={14} /> : t("Vender")}</Button>}
          </div>;
        })}
      </section>}
      <p className="text-xs text-muted-foreground">{t("Las predicciones en vivo se operan en un mercado externo con USDC real; BÓVEDA no es la contraparte. El pago ganador se acredita automáticamente.")}</p>
    </div>
  );
}
