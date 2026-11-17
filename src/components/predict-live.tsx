import { TapAmount } from "@/components/ui/tap-amount";
import { Dismissible } from "@/components/dismissible";
import { notify } from "@/lib/notify";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CoinbaseNote } from "@/components/coinbase-note";
import { GoogleButton } from "@/components/google-button";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { PredictPositionCard } from "@/components/predict-position-card";
import { SolConvertShortcut } from "@/components/sol-convert-shortcut";
import { ShareWin } from "@/components/share-win";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { GasRefillCard } from "@/components/gas-refill-card";
import { useT } from "@/lib/i18n";
import { PREDICT_MAX_USDC, PREDICT_MIN_USDC, assetOfTitle, positionWon, potentialProfit, type LiveRound, type PredictPosition, type PredictQuote, type PredictSide } from "@/lib/predict";
import { executePredict, getPredictOrderStatus, getPredictPositions, preparePredictBuy, preparePredictClaim, preparePredictSell } from "@/lib/predict.functions";
import { buildSwap, JUPUSD_MINT, quoteSwap, readTokenBalance, toBaseUnits } from "@/lib/wallet-actions";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";
import { annotateRecord } from "@/lib/predict-history";
import { predictClaimFee } from "@/lib/fees";
import { useAffiliateReport } from "@/hooks/use-affiliate-report";
import { ActionSuccess } from "@/components/action-success";
import { FlowSteps, WorkingLine } from "@/components/move-steps";
import { DetailsToggle } from "@/components/ui/details-toggle";

const usdc = (micro: string | bigint | null) => micro === null ? "—" : (Number(micro) / 1e6).toFixed(2);
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const dismissedLost = (wallet: string) => { try { const v = JSON.parse(localStorage.getItem(`boveda:predict-lost-seen:${wallet}`) ?? "[]"); return new Set<string>(Array.isArray(v) ? v : []); } catch { return new Set<string>(); } };
const QUICK = [5, 10, 25, 50];
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));

/** Order ticket for the selected live Up/Down round. Wallet USDC only; BÓVEDA is never the counterparty. */
export function PredictLive({ round, chart }: { round: LiveRound | null; chart?: ReactNode }) {
  const t = useT();
  const session = useBovedaSession();
  const reportAffiliate = useAffiliateReport();
  const wallet = session.walletAddress;
  const qc = useQueryClient();
  const [side, setSide] = useState<PredictSide | null>(null);
  const [amount, setAmount] = useState("5");
  // Visitors browse freely; acting asks for sign-in right here without leaving the round.
  const [askLogin, setAskLogin] = useState(false);
  const [review, setReview] = useState<{ side: PredictSide; round: LiveRound; quote: PredictQuote; tx: string; context: string; order: string | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // After "Confirmar" the entry continues in its own window: progress while the round accepts it, then the receipt.
  const [placed, setPlaced] = useState<{ phase: "confirming" | "active" | "refunded" | "slow"; side: PredictSide; cost: string; payout: string; sig: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; sig?: string; wallet?: boolean; pending?: boolean; sticky?: boolean } | null>(null);
  const [positions, setPositions] = useState<PredictPosition[]>([]);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [win, setWin] = useState<string | null>(null);
  const [lost, setLost] = useState<PredictPosition[]>([]);
  const prevRef = useRef<PredictPosition[]>([]);
  const doneRef = useRef(new Set<string>());
  const lostRef = useRef(new Set<string>());

  useEffect(() => { setReview(null); }, [round?.marketId]);
  // The quote lives in a pop-up so choosing a side never scrolls the page.
  const cancelQuote = () => { setSide(null); setReview(null); };
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
  const [needsReserve, setNeedsReserve] = useState(false);
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
        if (!r.success) { setNeedsReserve("reserve" in r && r.reserve === true); throw new Error(r.error); }
        setNeedsReserve(false);
        setReview({ side, round, quote: r.quote, tx: r.transaction, context: r.context, order: r.orderPubkey ?? null }); setQuoteErr(null);
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
      // Order placed: clear the side so the 15s quote loop stops and the screen returns to normal.
      seq.current++; setSide(null); setReview(null); setQuoteErr(null);
      const spent = toBaseUnits(amount, "USDC") ?? 0n;
      setBalance((b) => b === null ? b : b > spent ? b - spent : 0n);
      sync();
      const base = { side: review.side, cost: usdc(review.quote.costMicro), payout: usdc(review.quote.contractsMicro), sig };
      if (review.order) { setPlaced({ ...base, phase: "confirming" }); void followOrder(review.order, sig, review.quote.costMicro); }
      else { setPlaced({ ...base, phase: "active" }); notify("round", t("Predicción enviada"), t("Te avisamos al cerrar la ronda")); }
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  // The signature only creates the order; the market fills it seconds later or refunds it. Tell the user which one happened.
  const followOrder = async (order: string, sig: string, costMicro: string) => {
    const started = Date.now();
    while (Date.now() - started < 45_000) {
      await new Promise((r) => setTimeout(r, 2500));
      const r = await getPredictOrderStatus({ data: { order } }).catch(() => null);
      if (r?.state === "filled") {
        setPlaced((x) => x && x.sig === sig ? { ...x, phase: "active" } : x);
        notify("round", t("Predicción activa"), t("Te avisamos al cerrar la ronda"));
        sync(); return;
      }
      if (r?.state === "refunded") {
        setPlaced((x) => x && x.sig === sig ? { ...x, phase: "refunded" } : x);
        setMsg({ ok: true, sticky: true, wallet: true, text: t("Orden no completada: el precio cambió antes de entrar a la ronda. Te devolvimos ${v} completos y están listos en Mi Billetera.", { v: usdc(costMicro) }) });
        notify("info", t("Orden no completada"), t("Te devolvimos tu dinero · Mi Billetera"));
        sync(); void qc.invalidateQueries({ queryKey: ["predict-refunds", wallet] }); return;
      }
    }
    setPlaced((x) => x && x.sig === sig ? { ...x, phase: "slow" } : x);
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
      setMsg({ ok: true, text: t("Venta confirmada. El dinero está en tu wallet."), sig });
      notify("success", t("Posición cerrada"), t("El dinero está en tu billetera"));
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
      setMsg({ ok: true, text: t("Pago cobrado. Pasándolo a dólares…"), sig });
      // Payout arrives as the venue's stable dollar; convert the whole balance to USDC with a second wallet signature.
      try {
        await new Promise((r) => setTimeout(r, 2500));
        const bal = await readTokenBalance(wallet, JUPUSD_MINT);
        if (bal > 0n) {
          const q = await quoteSwap("JupUSD", "USDC", bal, { feeUsdc: predictClaimFee(BigInt(p.payoutMicro || "0"), BigInt(p.costMicro || "0")) });
          const swapSig = await session.signAndSend(await buildSwap(wallet, q));
          if (BigInt(q.feeUsdc) > 0n) void reportAffiliate(swapSig, "predict");
          setMsg({ ok: true, text: t("Ganancias reclamadas. ${v} llegaron a tu wallet.", { v: usdc(q.outAmount) }), wallet: true });
        } else setMsg({ ok: true, text: t("Ganancias reclamadas. ${v} llegaron a tu wallet.", { v: usdc(p.payoutMicro) }), wallet: true });
      } catch { setMsg({ ok: true, text: t("Pago cobrado, pero falta el paso a dólares. Hazlo en Mi Billetera → Cambiar."), sig }); }
      sync();
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      {/* Quick stake: one tap picks the amount and both buttons show what it would pay right now. */}
      <div className="flex items-center gap-2" role="group" aria-label={t("Jugada rápida")}>
        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{t("Jugada rápida")}</span>
        <div className="grid flex-1 grid-cols-4 gap-1.5">{QUICK.map((v) => { const on = Number(amount) === v; return <button key={v} type="button" aria-pressed={on} onClick={() => { setAmount(String(v)); setReview(null); }} className={`rounded-full border py-1.5 text-sm font-bold tabular-nums transition active:scale-95 ${on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground"}`}>${v}</button>; })}</div>
      </div>
      {/* One-tap "go with the crowd": picks the side the live market odds favor and opens the same confirm sheet. */}
      {(() => { const ou = round?.upPrice, od = round?.downPrice; if (!ou || !od) return null; const fav: PredictSide = ou >= od ? "up" : "down"; const fp = fav === "up" ? ou : od; const pct = Math.round((fp / (ou + od)) * 100); if (pct < 55) return <p className="rounded-2xl border border-border bg-muted px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{t("⚖️ Ronda pareja: el mercado está dividido. Elige tú.")}</p>; const upFav = fav === "up"; return <button type="button" onClick={() => { if (!session.authenticated) { setAskLogin(true); return; } setSide(fav); setReview(null); }}
        className={`cta-attn relative w-full overflow-hidden rounded-2xl border-2 px-4 py-3 text-left transition active:scale-[0.98] ${upFav ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "border-destructive bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30"}`}>
        <span className="flex items-center justify-between gap-2"><span className="font-display text-lg font-extrabold">🔥 {t("Ir con la mayoría")}</span><span className="font-display text-lg font-bold tabular-nums">{upFav ? "▲" : "▼"} {t(upFav ? "Sube" : "Baja")} {pct}%</span></span>
        {amt > 0 && <span className="mt-0.5 block text-xs font-semibold tabular-nums opacity-90">{t("Pones ${a} → recibes ≈${b} si acierta la mayoría", { a: amt % 1 ? amt.toFixed(2) : String(amt), b: (amt / fp).toFixed(2) })}</span>}
      </button>; })()}
      <div className="grid grid-cols-2 gap-3">
        {(["up", "down"] as const).map((s) => {
          const p = priceOf(s), on = side === s, up = s === "up";
          const Icon = up ? ArrowUpRight : ArrowDownRight;
          return <button key={s} type="button" disabled={!p} aria-pressed={on} onClick={() => { if (!session.authenticated) { setAskLogin(true); return; } if (on) { cancelQuote(); return; } setSide(s); setReview(null); }}
            className={`relative overflow-hidden rounded-2xl border-2 p-3 text-left transition active:scale-[0.97] disabled:opacity-40 ${on ? (up ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "border-destructive bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30") : up ? "border-primary/40 bg-primary/5 text-primary" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
            <span className="flex items-center justify-between"><span className="font-display text-xl font-bold">{t(up ? "Sube" : "Baja")}</span><Icon size={22} /></span>
            <span className="mt-1 block font-display text-3xl font-bold tabular-nums">{p ? `${Math.round(p * 100)}%` : "—"}</span>
            <span className={`block text-xs font-semibold ${on ? "opacity-90" : "text-muted-foreground"}`}>{p ? t("Paga {x}×", { x: (1 / p).toFixed(2) }) : t("Sin precio")}</span>
            {p && amt > 0 && <span className={`mt-1.5 block rounded-lg px-2 py-1 text-xs font-bold tabular-nums transition-colors ${on ? "bg-background/20" : up ? "bg-primary/15" : "bg-destructive/15"}`}><span className="block text-[10px] font-semibold opacity-80">{t("Con ${a} recibes", { a: amt % 1 ? amt.toFixed(2) : String(amt) })}</span><span className="block text-base">≈${(amt / p).toFixed(2)}</span></span>}
            <span className={`mt-1 block text-[11px] font-semibold ${on ? "opacity-90" : ""}`}>{t(up ? "Ganas si el precio sube" : "Ganas si el precio baja")}</span>
          </button>;
        })}
      </div>

      {chart}
      {!side && <p className="text-center text-xs text-muted-foreground">{t("Elige Sube o Baja para ver tu pago.")}</p>}
      <Dialog open={askLogin} onOpenChange={setAskLogin}>
        <ActionSheetContent>
          <DialogTitle className="pr-10 font-display text-xl">{t("Inicia sesión para confirmar tu jugada")}</DialogTitle>
          <DialogDescription asChild><div><CoinbaseNote /></div></DialogDescription>
          <div className="mt-4 grid gap-2">
            <GoogleButton className="h-12 w-full" onClick={() => { setAskLogin(false); session.login("google"); }}>{t("Continuar con Google")}</GoogleButton>
            <Button variant="secondary" className="h-11 w-full" onClick={() => { setAskLogin(false); session.login("email"); }}>{t("Entrar con email")}</Button>
            <Button variant="ghost" className="w-full" onClick={() => setAskLogin(false)}>{t("Seguir mirando")}</Button>
          </div>
        </ActionSheetContent>
      </Dialog>
      <Dialog open={!!side} onOpenChange={(o) => { if (!o && busy !== "sign") cancelQuote(); }}>
        <ActionSheetContent closeLabel={t("Cerrar")} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogTitle className={`flex items-center gap-2 pr-10 font-display text-xl ${side === "down" ? "text-destructive" : "text-primary"}`}>{side === "down" ? <ArrowDownRight size={22} /> : <ArrowUpRight size={22} />}{t(side === "down" ? "Predecir Baja" : "Predecir Sube")}{selPrice ? <span className="ml-auto text-sm font-semibold tabular-nums">{t("Paga {x}×", { x: (1 / selPrice).toFixed(2) })}</span> : null}</DialogTitle>
          <DialogDescription className="text-xs">{t(side === "down" ? "Ganas si el precio baja" : "Ganas si el precio sube")}</DialogDescription>
      <section aria-label={t("Tu orden")}>
          <div className="flex items-center justify-between"><label htmlFor="predict-amount" className="text-sm font-semibold">{t("Estás poniendo ($)")}</label><span className="text-xs text-muted-foreground">{t("Disponible")}: <strong className="text-foreground tabular-nums">{!wallet ? "—" : balance === null ? "…" : `$${usdc(balance)}`}</strong></span></div>
          <TapAmount id="predict-amount" className="mt-1" label={t("Estás poniendo ($)")} prefix="$" value={amount} onChange={(v) => { setAmount(v.replace(",", ".").replace(/[^0-9.]/g, "")); setReview(null); }} />
          <div className="mt-2 grid grid-cols-5 gap-2">{[5, 10, 25, 50].map((v) => { const on = Number(amount) === v; return <Button key={v} type="button" variant={on ? "default" : "secondary"} size="sm" aria-pressed={on} onClick={() => { setAmount(String(v)); setReview(null); }}>${v}</Button>; })}<Button type="button" variant="outline" size="sm" disabled={!maxMicro || maxMicro <= 0n} onClick={() => { if (maxMicro) { setAmount((Math.floor(Number(maxMicro) / 1e4) / 100).toFixed(2)); setReview(null); } }}>{t("Máx")}</Button></div>
          {!inRange && <p className="mt-2 text-xs text-destructive">{t("Entre {min} y ${max}.", { min: PREDICT_MIN_USDC, max: PREDICT_MAX_USDC })}</p>}
          {short && <p className="mt-2 text-xs text-destructive">{t("Saldo insuficiente: tienes ${v}.", { v: usdc(balance) })} <Link to="/wallet" className="underline">{t("Depositar o cambiar a dólares")}</Link></p>}
          {inRange && selPrice && !review && <div className="mt-3 rounded-xl bg-secondary/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">{t("Si aciertas recibes aprox.")}</p>
            <p className="font-display text-2xl font-bold text-primary tabular-nums">${(amt / selPrice).toFixed(2)}</p>
            {short && <p className="pt-1 text-[11px] text-muted-foreground">{t("Cotización con el precio actual del mercado. Fondea tu wallet para firmarla.")}</p>}
          </div>}
          {short && <SolConvertShortcut className="mt-3" />}
          {short && side && <Button asChild className="mt-3 h-12 w-full rounded-xl text-base font-bold"><Link to="/wallet">{t("Depositar o cambiar a dólares")}</Link></Button>}
          {!side && <p className="mt-3 text-center text-xs text-muted-foreground">{t("Elige Sube o Baja para ver tu pago.")}</p>}
          {!wallet ? <p className="mt-3 rounded-xl bg-secondary p-3 text-center text-sm font-semibold">{t("Entra con tu cuenta para predecir en vivo con los dólares de tu wallet.")}</p>
            : !review && !short && <Button disabled className="mt-3 h-12 w-full rounded-xl text-base font-bold">{quoting ? <><Loader2 className="animate-spin" /> {t("Cotizando en la red…")}</> : side ? t(side === "up" ? "Predecir Sube" : "Predecir Baja") : t("Elige Sube o Baja")}</Button>}
          {quoteErr && !needsReserve && <p className="mt-2 text-xs text-destructive">{t("No se pudo cotizar ahora mismo. Reintentando…")}</p>}
          {needsReserve && wallet && <div className="mt-3"><GasRefillCard force target="deposit" sol={1n} usdc={units ?? 0n} onDone={() => setNeedsReserve(false)} /></div>}
          {side && !review && <Button type="button" variant="ghost" className="mt-2 w-full" onClick={cancelQuote}>{t("Cancelar cotización")}</Button>}
        </section>
  
        {review && <section className="space-y-3 rounded-2xl border-2 border-primary/50 bg-primary/5 p-4 text-sm" aria-label={t("Revisión")}>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{t("Si aciertas recibes")} {quoting && <Loader2 size={12} className="inline animate-spin align-[-1px]" />}</p>
            <p className="font-display text-3xl font-bold text-primary tabular-nums">${usdc(review.quote.contractsMicro)}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{t("Pones")} ${usdc(review.quote.costMicro)} · {t(review.side === "up" ? "Sube" : "Baja")}</p>
          </div>
          <Button size="lg" className="h-12 w-full rounded-xl text-base font-bold" disabled={busy === "sign"} onClick={confirm}>{busy === "sign" ? <><Loader2 className="animate-spin" /> {t("Aprueba en tu billetera…")}</> : t("Confirmar jugada")}</Button>
          <DetailsToggle>
            <div className="grid gap-1 rounded-xl border border-border p-3">
              <p className="flex justify-between"><span className="text-muted-foreground">{t("Pagas")}</span><strong className="tabular-nums">${usdc(review.quote.costMicro)}</strong></p>
              <p className="flex justify-between"><span className="text-muted-foreground">{t("Ganancia posible")}</span><strong className="tabular-nums">+${usdc(potentialProfit(review.quote))}</strong></p>
              {selPrice ? <p className="flex justify-between"><span className="text-muted-foreground">{t("Precio por contrato")}</span><strong className="tabular-nums">{Math.round(selPrice * 100)}¢ · {(1 / selPrice).toFixed(2)}×</strong></p> : null}
            </div>
            <p className="text-xs text-muted-foreground">{t("Precio real del momento; se actualiza cada 15 s.")} {t("Al expirar el tiempo la posición se cierra sola: si ganas, aparece tu premio para reclamar; si pierdes, desaparece. También puedes vender antes del cierre al precio del momento.")}</p>
          </DetailsToggle>
          <Button type="button" variant="ghost" className="w-full" disabled={busy === "sign"} onClick={cancelQuote}>{t("Cancelar cotización")}</Button>
        </section>}
        </ActionSheetContent>
      </Dialog>

      <Dialog open={!!placed} onOpenChange={(o) => { if (!o) setPlaced(null); }}>
        <ActionSheetContent closeLabel={t("Cerrar")} className="sm:max-w-sm">
          {placed?.phase === "active" ? <ActionSuccess destination="/portfolio" title={t("¡Predicción activa!")} amount={{ value: placed.cost, unit: "$", label: t(placed.side === "up" ? "Sube" : "Baja") }}
            body={t("Si aciertas, tu premio aparece en Ganancias para cobrarlo.")}
            details={[{ label: t("Si aciertas recibes"), value: `$${placed.payout}` }, { label: t("Comisión de entrada"), value: "$0.00" }]} signature={placed.sig} onClose={() => setPlaced(null)} />
          : placed && <>
            <DialogTitle className="pr-10 font-display text-xl">{placed.phase === "refunded" ? t("Orden no completada") : t("Entrando a la ronda")}</DialogTitle>
            <DialogDescription>{t("Pones ${a} · si aciertas recibes ${b}", { a: placed.cost, b: placed.payout })}</DialogDescription>
            {placed.phase === "confirming" && <><FlowSteps current={2} /><WorkingLine text={t("Confirmando tu entrada a la ronda…")} /></>}
            {placed.phase === "refunded" && <p role="status" className="text-sm">{t("El precio cambió antes de entrar a la ronda. Te devolvimos ${v} completos a tu billetera.", { v: placed.cost })}</p>}
            {placed.phase === "slow" && <p role="status" className="text-sm">{t("Tu orden sigue en proceso. Si no logra entrar a la ronda, te devolvemos el dinero y te avisamos en la campanita.")}</p>}
            {placed.phase !== "confirming" && <Button className="w-full" onClick={() => setPlaced(null)}>{t("Entendido")}</Button>}
          </>}
        </ActionSheetContent>
      </Dialog>
      {msg && <Dismissible key={msg.text} onDismiss={() => setMsg(null)} ms={msg.sticky ? Infinity : msg.ok ? 6000 : 10000} className={`rounded-xl border p-3 pr-10 ${msg.ok ? "border-primary/30 bg-primary/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}><p role="status" className="text-sm">{msg.pending && <Loader2 size={14} className="mr-1 inline animate-spin align-[-2px]" />}{msg.text} {msg.wallet && <Link to="/wallet" className="font-semibold underline">{t("Ir a Mi Billetera")}</Link>}{msg.sig && <a className="inline-flex items-center gap-1 underline" href={`https://orbmarkets.io/tx/${msg.sig}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}<ExternalLink size={12} /></a>}</p></Dismissible>}
      {win && <ShareWin headline={t("¡Acerté! +${v}", { v: win })} />}

      {lost.length > 0 && <section className="space-y-2" aria-label={t("Predicciones no acertadas")}>
        {lost.map((p) => <div key={p.pubkey} role="status" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <p className="font-semibold text-destructive">{t("No acertaste · {a} {s}", { a: assetOfTitle(p.title) ?? "", s: p.side === "up" ? t("Sube") : t("Baja") })}</p>
          <p className="mt-1 text-sm">{t("La ronda cerró en la dirección contraria. Perdiste lo invertido: -${v}.", { v: usdc(p.costMicro) })}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => dismissLost(p.pubkey)}>{t("Entendido")}</Button>
        </div>)}
      </section>}
      {positions.length > 0 && (() => { const here = round ? positions.filter((p) => p.marketId === round.marketId || p.marketId === round.downMarketId || p.eventId === round.eventId) : []; const stake = here.reduce((n, p) => n + BigInt(p.costMicro || "0"), 0n); return <section role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-4 text-sm">
        <p>{here.length > 0 ? t("Tienes una predicción activa en esta ronda: ${v} en {s}", { v: usdc(stake), s: here[0]?.side === "up" ? t("Sube") : t("Baja") }) : t("Tienes {n} predicciones abiertas", { n: positions.length })}</p>
        <Link to="/portfolio" className="font-semibold text-primary underline">{t("Ver en Portafolio")}</Link>
      </section>; })()}
    </div>
  );
}
