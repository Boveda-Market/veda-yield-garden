import { Dismissible } from "@/components/dismissible";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PredictPositionCard } from "@/components/predict-position-card";
import { SolConvertShortcut } from "@/components/sol-convert-shortcut";
import { ShareWin } from "@/components/share-win";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { PREDICT_MAX_USDC, PREDICT_MIN_USDC, assetOfTitle, positionWon, potentialProfit, type LiveRound, type PredictPosition, type PredictQuote, type PredictSide } from "@/lib/predict";
import { executePredict, getPredictPositions, preparePredictBuy, preparePredictClaim, preparePredictSell } from "@/lib/predict.functions";
import { buildSwap, JUPUSD_MINT, quoteSwap, readTokenBalance, toBaseUnits } from "@/lib/wallet-actions";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";
import { annotateRecord } from "@/lib/predict-history";
import { predictClaimFee } from "@/lib/fees";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";

const usdc = (micro: string | bigint | null) => micro === null ? "—" : (Number(micro) / 1e6).toFixed(2);
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const dismissedLost = (wallet: string) => { try { const v = JSON.parse(localStorage.getItem(`boveda:predict-lost-seen:${wallet}`) ?? "[]"); return new Set<string>(Array.isArray(v) ? v : []); } catch { return new Set<string>(); } };
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));

/** Order ticket for the selected live Up/Down round. Wallet USDC only; BÓVEDA is never the counterparty. */
export function PredictLive({ round }: { round: LiveRound | null }) {
  const t = useT();
  const session = useBovedaSession();
  const reportAffiliate = useAffiliateReport();
  const wallet = session.walletAddress;
  const qc = useQueryClient();
  const [side, setSide] = useState<PredictSide | null>(null);
  const [amount, setAmount] = useState("10");
  const [review, setReview] = useState<{ side: PredictSide; round: LiveRound; quote: PredictQuote; tx: string; context: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; sig?: string; wallet?: boolean } | null>(null);
  const [positions, setPositions] = useState<PredictPosition[]>([]);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [win, setWin] = useState<string | null>(null);
  const [lost, setLost] = useState<PredictPosition[]>([]);
  const prevRef = useRef<PredictPosition[]>([]);
  const doneRef = useRef(new Set<string>());
  const lostRef = useRef(new Set<string>());

  useEffect(() => { setReview(null); }, [round?.marketId]);
  const refresh = useCallback(async () => {
    if (!wallet) return;
    const r = await getPredictPositions({ data: { wallet } });
    if (!r.success) return;
    const nowSec = Date.now() / 1000;
    const seen = dismissedLost(wallet);
    const liveKeys = new Set(r.positions.map((p) => p.pubkey));
    // A lost round either reports result "no" for our side or simply vanishes after closing; keep it visible with an explanation.
    const newly = [...r.positions.filter((p) => positionWon(p) === false), ...prevRef.current.filter((p) => !liveKeys.has(p.pubkey) && !doneRef.current.has(p.pubkey) && positionWon(p) !== true && (p.closeTime ?? 0) < nowSec)].filter((p) => !seen.has(p.pubkey));
    if (newly.length) {
      setLost((old) => { const m = new Map(old.map((p) => [p.pubkey, p])); newly.forEach((p) => m.set(p.pubkey, p)); return [...m.values()]; });
      if (newly.some((p) => !lostRef.current.has(p.pubkey))) setMsg({ ok: false, text: t("Una de tus predicciones terminó y no acertaste. Abajo ves el detalle.") });
      newly.forEach((p) => lostRef.current.add(p.pubkey));
    }
    prevRef.current = r.positions.filter((p) => positionWon(p) !== false);
    setPositions(prevRef.current);
  }, [wallet, t]);
  const dismissLost = (pk: string) => { setLost((l) => l.filter((p) => p.pubkey !== pk)); if (wallet) try { const k = `boveda:predict-lost-seen:${wallet}`; localStorage.setItem(k, JSON.stringify([...dismissedLost(wallet), pk].slice(-200))); } catch {} };
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

  // Fast follow-up refreshes after a signed order so balances and cards update in about a second.
  const sync = () => { for (const ms of [600, 1500, 4000]) setTimeout(() => { void refresh(); void loadBalance(); for (const k of ["predict-positions", "my-wallet", "my-wallet-tokens"]) void qc.invalidateQueries({ queryKey: [k, wallet] }); }, ms); };
  const sign = async (tx: string, context: string) => {
    if (!session.signOnly) throw new Error(t("Tu wallet no admite esta operación."));
    const signed = await session.signOnly(fromB64(tx));
    const r = await executePredict({ data: { wallet: wallet!, signed: toB64(signed), context } });
    if (!r.success) throw new Error(r.error);
    return r.signature;
  };
  // Real network quote: build + simulate the exact signable order automatically, refreshed every 15s.
  const [quoting, setQuoting] = useState(false);
  const [quoteErr, setQuoteErr] = useState<string | null>(null);
  const seq = useRef(0);
  const unitsKey = units?.toString() ?? "";
  useEffect(() => {
    setReview(null); setQuoteErr(null);
    if (!wallet || !valid || !round || !side || !unitsKey) return;
    const run = async () => {
      if (busy === "sign") return;
      const id = ++seq.current; setQuoting(true);
      try {
        const r = await preparePredictBuy({ data: { wallet, marketId: round.marketId, isYes: side === "up", amount: unitsKey } });
        if (id !== seq.current) return;
        if (!r.success) throw new Error(r.error);
        setReview({ side, round, quote: r.quote, tx: r.transaction, context: r.context }); setQuoteErr(null);
      } catch (e) { if (id === seq.current) { setReview(null); setQuoteErr(e instanceof Error ? e.message : String(e)); } }
      finally { if (id === seq.current) setQuoting(false); }
    };
    const d = setTimeout(run, 500);
    const iv = setInterval(run, 15_000);
    return () => { clearTimeout(d); clearInterval(iv); seq.current++; setQuoting(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, valid, round?.marketId, side, unitsKey]);
  const confirm = async () => {
    if (!review || !wallet) return;
    setBusy("sign");
    try {
      const sig = await sign(review.tx, review.context);
      setReview(null);
      const spent = toBaseUnits(amount, "USDC") ?? 0n;
      setBalance((b) => b === null ? b : b > spent ? b - spent : 0n);
      setMsg({ ok: true, text: t("Predicción confirmada. Si aciertas, el pago llega solo a tu wallet al cerrar la ronda."), sig });
      sync();
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
      doneRef.current.add(p.pubkey); annotateRecord(wallet, p.pubkey, { soldMicro: p.valueMicro ?? "0", sellSig: sig });
      setMsg({ ok: true, text: t("Venta confirmada. El USDC está en tu wallet."), sig });
      sync();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };

  const claim = async (p: PredictPosition) => {
    if (!wallet) return; setBusy(p.pubkey); setMsg(null);
    try {
      const r = await preparePredictClaim({ data: { wallet, position: p.pubkey } });
      if (!r.success) throw new Error(r.error);
      const sig = await sign(r.transaction, r.context);
      setWin(usdc(BigInt(p.payoutMicro || "0") - BigInt(p.costMicro || "0")));
      doneRef.current.add(p.pubkey); annotateRecord(wallet, p.pubkey, { claimSig: sig });
      setMsg({ ok: true, text: t("Firma 1 de 2 lista: pago cobrado. Ahora firma la 2 de 2 para cambiarlo a USDC…"), sig });
      // Payout arrives as the venue's stable dollar; convert the whole balance to USDC with a second wallet signature.
      try {
        await new Promise((r) => setTimeout(r, 2500));
        const bal = await readTokenBalance(wallet, JUPUSD_MINT);
        if (bal > 0n) {
          const q = await quoteSwap("JupUSD", "USDC", bal, { feeUsdc: predictClaimFee(BigInt(p.payoutMicro || "0"), BigInt(p.costMicro || "0")) });
          const swapSig = await session.signAndSend(await buildSwap(wallet, q));
          if (BigInt(q.feeUsdc) > 0n) void reportAffiliate(swapSig, "predict");
          setMsg({ ok: true, text: t("Ganancias reclamadas. {v} USDC llegaron a tu wallet.", { v: usdc(q.outAmount) }), wallet: true });
        } else setMsg({ ok: true, text: t("Ganancias reclamadas. {v} USDC llegaron a tu wallet.", { v: usdc(p.payoutMicro) }), wallet: true });
      } catch { setMsg({ ok: true, text: t("Pago cobrado, pero falta el cambio a USDC. Hazlo en Mi Billetera → Cambiar (JupUSD → USDC)."), sig }); }
      sync();
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
            <span className={`mt-1 block text-[11px] font-semibold ${on ? "opacity-90" : ""}`}>{t(up ? "Ganas si el precio sube" : "Ganas si el precio baja")}</span>
          </button>;
        })}
      </div>

      <section className="rounded-2xl border border-border bg-card p-4" aria-label={t("Tu orden")}>
        <div className="flex items-center justify-between"><label htmlFor="predict-amount" className="text-sm font-semibold">{t("Estás poniendo (USDC)")}</label><span className="text-xs text-muted-foreground">{t("Disponible")}: <strong className="text-foreground tabular-nums">{!wallet ? "—" : balance === null ? "…" : usdc(balance)} USDC</strong></span></div>
        <input id="predict-amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setReview(null); }} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 font-display text-xl font-bold" />
        <div className="mt-2 grid grid-cols-5 gap-2">{[5, 10, 25, 50].map((v) => <Button key={v} type="button" variant="secondary" size="sm" onClick={() => { setAmount(String(v)); setReview(null); }}>${v}</Button>)}<Button type="button" variant="outline" size="sm" disabled={!maxMicro || maxMicro <= 0n} onClick={() => { if (maxMicro) { setAmount((Math.floor(Number(maxMicro) / 1e4) / 100).toFixed(2)); setReview(null); } }}>{t("Máx")}</Button></div>
        {!inRange && <p className="mt-2 text-xs text-destructive">{t("Entre {min} y {max} USDC.", { min: PREDICT_MIN_USDC, max: PREDICT_MAX_USDC })}</p>}
        {short && <p className="mt-2 text-xs text-destructive">{t("Saldo insuficiente: tienes {v} USDC.", { v: usdc(balance) })} <Link to="/wallet" className="underline">{t("Depositar o cambiar a USDC")}</Link></p>}
        {inRange && selPrice && !review && <div className="mt-3 space-y-1 rounded-xl bg-secondary/50 p-3 text-sm">
          <p className="flex justify-between"><span className="text-muted-foreground">{t("Pones")}</span><strong className="tabular-nums">{amt.toFixed(2)} USDC</strong></p>
          <p className="flex justify-between"><span className="text-muted-foreground">{t("Si aciertas recibes aprox.")}</span><strong className="text-primary tabular-nums">{(amt / selPrice).toFixed(2)} USDC</strong></p>
          <p className="flex justify-between"><span className="text-muted-foreground">{t("Ganancia posible")}</span><strong className="tabular-nums">+{(amt / selPrice - amt).toFixed(2)} USDC</strong></p>
          <p className="flex justify-between"><span className="text-muted-foreground">{t("Precio por contrato")}</span><strong className="tabular-nums">{Math.round(selPrice * 100)}¢ · {(1 / selPrice).toFixed(2)}×</strong></p>
          {short && <p className="pt-1 text-[11px] text-muted-foreground">{t("Cotización con el precio actual del mercado. Fondea tu wallet para firmarla.")}</p>}
        </div>}
        {short && <SolConvertShortcut className="mt-3" />}
        {short && side && <Button asChild className="mt-3 h-12 w-full rounded-xl text-base font-bold"><Link to="/wallet">{t("Depositar o cambiar a USDC")}</Link></Button>}
        {!side && <p className="mt-3 text-center text-xs text-muted-foreground">{t("Elige Sube o Baja para ver tu pago.")}</p>}
        {!wallet ? <p className="mt-3 rounded-xl bg-secondary p-3 text-center text-sm font-semibold">{t("Entra con tu cuenta para predecir en vivo con el USDC de tu wallet.")}</p>
          : !review && !short && <Button disabled className="mt-3 h-12 w-full rounded-xl text-base font-bold">{quoting ? <><Loader2 className="animate-spin" /> {t("Cotizando en la red…")}</> : side ? t(side === "up" ? "Predecir Sube" : "Predecir Baja") : t("Elige Sube o Baja")}</Button>}
        {quoteErr && <p className="mt-2 text-xs text-destructive">{t("No se pudo cotizar ahora mismo. Reintentando…")}</p>}
        {wallet && !review && <p className="mt-2 text-[11px] text-muted-foreground">{t("La cotización real aparece aquí, lista para firmar.")}</p>}
      </section>

      {review && <section className="space-y-2 rounded-2xl border-2 border-primary/50 bg-primary/5 p-4 text-sm" aria-label={t("Revisión")}>
        <p className="flex items-center justify-between font-semibold"><span>{t("Cotización real")} · {t(review.side === "up" ? "Sube" : "Baja")}</span>{quoting && <Loader2 size={14} className="animate-spin text-muted-foreground" />}</p>
        <p className="text-[11px] text-muted-foreground">{t("Transacción simulada en la red; se actualiza cada 15 s.")}</p>
        <p className="flex justify-between"><span>{t("Pagas")}</span><strong>{usdc(review.quote.costMicro)} USDC</strong></p>
        <p className="flex justify-between"><span>{t("Si aciertas recibes")}</span><strong className="text-primary">{usdc(review.quote.contractsMicro)} USDC</strong></p>
        <p className="flex justify-between"><span>{t("Ganancia posible")}</span><strong>+{usdc(potentialProfit(review.quote))} USDC</strong></p>
        <p className="text-xs text-muted-foreground">{t("Al expirar el tiempo la posición se cierra sola: si ganas, aparece tu premio para reclamar; si pierdes, desaparece. También puedes vender antes del cierre al precio del momento.")}</p>
        <Button className="w-full" disabled={busy === "sign"} onClick={confirm}>{busy === "sign" ? <Loader2 className="animate-spin" /> : t("Confirmar y firmar")}</Button>
      </section>}

      {msg && <Dismissible key={msg.text} onDismiss={() => setMsg(null)} ms={msg.ok ? 6000 : 10000} className={`rounded-xl border p-3 pr-10 ${msg.ok ? "border-primary/30 bg-primary/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}><p role="status" className="text-sm">{msg.text} {msg.wallet && <Link to="/wallet" className="underline">{t("Ver en tu wallet")}</Link>}{msg.sig && <a className="inline-flex items-center gap-1 underline" href={`https://orbmarkets.io/tx/${msg.sig}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}<ExternalLink size={12} /></a>}</p></Dismissible>}
      {win && <ShareWin headline={t("¡Acerté! +{v} USDC", { v: win })} />}

      {lost.length > 0 && <section className="space-y-2" aria-label={t("Predicciones no acertadas")}>
        {lost.map((p) => <div key={p.pubkey} role="status" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">{t("No acertaste · {a} {s}", { a: assetOfTitle(p.title) ?? "", s: p.side === "up" ? t("Sube") : t("Baja") })}</p>
          <p className="mt-1 text-sm">{t("La ronda cerró en la dirección contraria. Perdiste lo invertido: -{v} USDC.", { v: usdc(p.costMicro) })}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("Por eso ya no aparece entre tus predicciones abiertas. No hay nada que reclamar.")}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => dismissLost(p.pubkey)}>{t("Entendido")}</Button>
        </div>)}
      </section>}
      {positions.length > 0 && (() => { const here = round ? positions.filter((p) => p.marketId === round.marketId || p.marketId === round.downMarketId || p.eventId === round.eventId) : []; const stake = here.reduce((n, p) => n + BigInt(p.costMicro || "0"), 0n); return <section role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
        <p>{here.length > 0 ? t("Tienes una predicción activa en esta ronda: {v} USDC en {s}", { v: usdc(stake), s: here[0]?.side === "up" ? t("Sube") : t("Baja") }) : t("Tienes {n} predicciones abiertas", { n: positions.length })}</p>
        <Link to="/portfolio" className="font-semibold text-primary underline">{t("Ver en Portafolio")}</Link>
      </section>; })()}
      <p className="text-xs text-muted-foreground">{t("Las predicciones en vivo se operan en un mercado externo con USDC real; BÓVEDA no es la contraparte. El pago ganador se acredita automáticamente.")}</p>
    </div>
  );
}
