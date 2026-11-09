import { useCallback, useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Clock, ExternalLink, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareWin } from "@/components/share-win";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { PREDICT_MAX_USDC, PREDICT_MIN_USDC, potentialProfit, type LiveRound, type PredictPosition, type PredictQuote, type PredictSide, type PredictWindow } from "@/lib/predict";
import { executePredict, getLiveRounds, getPredictPositions, preparePredictBuy, preparePredictSell } from "@/lib/predict.functions";
import { toBaseUnits } from "@/lib/wallet-actions";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";
import { Link } from "@tanstack/react-router";

const usdc = (micro: string | bigint | null) => micro === null ? "—" : (Number(micro) / 1e6).toFixed(2);
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));
const clock = (s: number) => { s = Math.max(0, s); const m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, "0")}`; };

export function PredictLive({ market, window, momentum = 50 }: { market: string; window: PredictWindow; momentum?: number }) {
  const t = useT();
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const [rounds, setRounds] = useState<LiveRound[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState("10");
  const [review, setReview] = useState<{ side: PredictSide; quote: PredictQuote; tx: string; context: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);
  const [positions, setPositions] = useState<PredictPosition[]>([]);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [win, setWin] = useState<string | null>(null);

  useEffect(() => { const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    let alive = true;
    const load = async () => { const r = await getLiveRounds(); if (alive) { setRounds(r.rounds); setLoaded(true); } };
    void load(); const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  const refresh = useCallback(async () => {
    if (!wallet) return;
    const r = await getPredictPositions({ data: { wallet } });
    if (r.success) setPositions(r.positions);
  }, [wallet]);
  useEffect(() => { void refresh(); const id = setInterval(refresh, 10_000); return () => clearInterval(id); }, [refresh]);
  const [balance, setBalance] = useState<bigint | null>(null);
  const loadBalance = useCallback(async () => {
    if (!wallet) return;
    try { const r = await getRealWallet({ data: { wallet } }); if (r.success) setBalance(decimalToUnits(r.data.usdc, 6) ?? 0n); } catch { /* keep last */ }
  }, [wallet]);
  useEffect(() => { void loadBalance(); const id = setInterval(loadBalance, 20_000); return () => clearInterval(id); }, [loadBalance]);

  const round = rounds.find((r) => r.series === market.toLowerCase() && r.window === window && r.closeTime > now);
  useEffect(() => { setReview(null); }, [round?.eventId]);

  if (!wallet) return (
    <section className="rounded-2xl border border-border bg-secondary/40 p-5">
      <div className="flex items-center gap-2"><Wallet size={18} /><h2 className="font-semibold">{t("En vivo con USDC")}</h2></div>
      <p className="mt-2 text-sm text-muted-foreground">{t("Entra con tu cuenta para predecir en vivo con el USDC de tu wallet.")}</p>
    </section>
  );

  const units = toBaseUnits(amount, "USDC");
  const inRange = !!units && units >= BigInt(PREDICT_MIN_USDC * 1e6) && units <= BigInt(PREDICT_MAX_USDC * 1e6);
  const short = !!units && balance !== null && units > balance;
  const valid = inRange && !short;
  const maxMicro = balance === null ? null : (balance < BigInt(PREDICT_MAX_USDC * 1e6) ? balance : BigInt(PREDICT_MAX_USDC * 1e6));
  const progress = round ? Math.min(100, Math.max(0, ((now - round.openTime) / Math.max(1, round.closeTime - round.openTime)) * 100)) : 0;

  const sign = async (tx: string, context: string) => {
    if (!session.signOnly) throw new Error(t("Tu wallet no admite esta operación."));
    const signed = await session.signOnly(fromB64(tx));
    const r = await executePredict({ data: { wallet, signed: toB64(signed), context } });
    if (!r.success) throw new Error(r.error);
    return r.signature;
  };
  const prepare = async (side: PredictSide) => {
    if (!units || !valid || !round) return;
    setBusy(side); setMsg(null); setReview(null);
    try {
      const r = await preparePredictBuy({ data: { wallet, marketId: side === "up" ? round.up : round.down, amount: units.toString() } });
      if (!r.success) throw new Error(r.error);
      setReview({ side, quote: r.quote, tx: r.transaction, context: r.context });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  const confirm = async () => {
    if (!review) return;
    setBusy("sign");
    try {
      const sig = await sign(review.tx, review.context);
      setReview(null);
      setMsg({ ok: true, text: t("Predicción confirmada. Al cerrar la ronda, si aciertas, el pago llega solo a tu wallet."), sig });
      setTimeout(() => { void refresh(); void loadBalance(); }, 3000);
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  const sell = async (p: PredictPosition) => {
    setBusy(p.pubkey); setMsg(null);
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
      {!loaded ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={16} />{t("Buscando la ronda en vivo…")}</p>
        : !round ? <p className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm"><Clock size={16} />{t("No hay ronda en vivo para {m} en {w} ahora mismo. Hoy están disponibles Bitcoin 5 min y 15 min.", { m: market, w: window })}</p>
        : <>
          <div className="flex items-center justify-between rounded-xl bg-secondary p-3 text-sm"><span>{t("Ronda en vivo")}</span><strong className="font-display text-xl tabular-nums">{clock(round.closeTime - now)}</strong></div>
          <div className="-mt-2 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
          <div>
            <div className="flex items-center justify-between"><label htmlFor="predict-amount" className="text-sm font-semibold">{t("Tu predicción (USDC)")}</label><span className="text-xs text-muted-foreground">{t("Disponible")}: <strong className="text-foreground tabular-nums">{balance === null ? "…" : usdc(balance)} USDC</strong></span></div>
            <input id="predict-amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setReview(null); }} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 font-display text-xl font-bold" />
            <div className="mt-2 grid grid-cols-5 gap-2">{[5, 10, 25, 50].map((v) => <Button key={v} type="button" variant="secondary" size="sm" onClick={() => { setAmount(String(v)); setReview(null); }}>{v}</Button>)}<Button type="button" variant="outline" size="sm" disabled={!maxMicro || maxMicro <= 0n} onClick={() => { if (maxMicro) { setAmount((Math.floor(Number(maxMicro) / 1e4) / 100).toFixed(2)); setReview(null); } }}>{t("Máx")}</Button></div>
            {!inRange && <p className="mt-2 text-xs text-destructive">{t("Entre {min} y {max} USDC.", { min: PREDICT_MIN_USDC, max: PREDICT_MAX_USDC })}</p>}
            {short && <p className="mt-2 text-xs text-destructive">{t("Saldo insuficiente: tienes {v} USDC.", { v: usdc(balance) })} <Link to="/wallet" className="underline">{t("Depositar o cambiar a USDC")}</Link></p>}
            {valid && <p className="mt-2 text-xs text-muted-foreground">{t("Si aciertas recibes aprox. el doble; verás la cifra exacta antes de firmar.")}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button disabled={!valid || !!busy} onClick={() => prepare("up")} className={`h-20 flex-col rounded-2xl text-xl font-bold shadow-lg active:scale-95 ${momentum > 55 ? "ring-2 ring-primary ring-offset-2" : ""}`}>{busy === "up" ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-1"><ArrowUpRight size={26} />{t("Sube")}</span>}</Button>
            <Button disabled={!valid || !!busy} onClick={() => prepare("down")} variant="destructive" className={`h-20 flex-col rounded-2xl text-xl font-bold shadow-lg active:scale-95 ${momentum < 45 ? "ring-2 ring-destructive ring-offset-2" : ""}`}>{busy === "down" ? <Loader2 className="animate-spin" /> : <span className="flex items-center gap-1"><ArrowDownRight size={26} />{t("Baja")}</span>}</Button>
          </div>
        </>}

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
        <h3 className="font-semibold">{t("Tus predicciones en vivo")}</h3>
        {positions.map((p) => {
          const pnl = p.pnlMicro ? BigInt(p.pnlMicro) : null;
          const open = p.status === "open";
          return <div key={p.pubkey} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
            <div><p className="font-semibold">{t(p.side === "up" ? "Sube" : "Baja")} · {usdc(p.costMicro)} USDC{open && pnl !== null && <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${pnl >= 0n ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{t(pnl >= 0n ? "Va a favor" : "Va en contra")}</span>}</p><p className="text-xs text-muted-foreground">{t("Pago si aciertas")} {usdc(p.payoutMicro)} USDC{pnl !== null ? ` · ${pnl >= 0n ? "+" : ""}${usdc(pnl)}` : ""}{!open && p.result ? ` · ${t("Resultado")}: ${p.result}` : ""}</p></div>
            {open && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => sell(p)}>{busy === p.pubkey ? <Loader2 className="animate-spin" size={14} /> : t("Vender")}</Button>}
          </div>;
        })}
      </section>}
      <p className="text-xs text-muted-foreground">{t("Las predicciones en vivo se operan en un mercado externo con USDC real; BÓVEDA no es la contraparte. El pago ganador se acredita automáticamente.")}</p>
    </div>
  );
}
