import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ExternalLink, Loader2, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShareWin } from "@/components/share-win";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { PREDICT_MAX_USDC, PREDICT_MIN_USDC, potentialProfit, type PolyEvent, type PredictPosition, type PredictQuote } from "@/lib/predict";
import { executePredict, getPolyEvents, getPredictPositions, preparePredictBuy, preparePredictSell } from "@/lib/predict.functions";
import { toBaseUnits } from "@/lib/wallet-actions";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";

const usdc = (micro: string | bigint | null) => micro === null ? "—" : (Number(micro) / 1e6).toFixed(2);
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toB64 = (b: Uint8Array) => btoa(Array.from(b, (x) => String.fromCharCode(x)).join(""));
const compact = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(0)}`;
const pct = (p: number | null) => p === null ? "—" : `${Math.round(p * 100)}%`;
const until = (sec: number, now: number) => { const s = Math.max(0, sec - now); const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };

type Pick = { marketId: string; title: string; yes: boolean; price: number };

/** Live Polymarket crypto markets, bought with wallet USDC. BÓVEDA is never the counterparty. */
export function PredictLive() {
  const t = useT();
  const session = useBovedaSession();
  const wallet = session.walletAddress;
  const [events, setEvents] = useState<PolyEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "btc" | "eth" | "other">("all");
  const [pick, setPick] = useState<Pick | null>(null);
  const [amount, setAmount] = useState("10");
  const [review, setReview] = useState<{ pick: Pick; quote: PredictQuote; tx: string; context: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);
  const [positions, setPositions] = useState<PredictPosition[]>([]);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [win, setWin] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => { const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000); return () => clearInterval(id); }, []);
  useEffect(() => {
    let alive = true;
    const load = async () => { const r = await getPolyEvents(); if (alive) { setEvents(r.events); setLoaded(true); } };
    void load(); const id = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
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

  const shown = useMemo(() => events.filter((e) => {
    const s = e.title.toLowerCase();
    const btc = s.includes("bitcoin"), eth = s.includes("ethereum");
    return filter === "all" || (filter === "btc" ? btc : filter === "eth" ? eth : !btc && !eth);
  }), [events, filter]);
  const ev = events.find((e) => e.eventId === sel) ?? null;

  // Keep the selected price fresh as the order book moves.
  const livePick = pick && ev ? (() => { const m = ev.markets.find((x) => x.marketId === pick.marketId); const p = m ? (pick.yes ? m.yes : m.no) : null; return p ? { ...pick, price: p } : pick; })() : pick;

  const units = toBaseUnits(amount, "USDC");
  const inRange = !!units && units >= BigInt(PREDICT_MIN_USDC * 1e6) && units <= BigInt(PREDICT_MAX_USDC * 1e6);
  const short = !!units && balance !== null && units > balance;
  const valid = inRange && !short && !!livePick;
  const maxMicro = balance === null ? null : (balance < BigInt(PREDICT_MAX_USDC * 1e6) ? balance : BigInt(PREDICT_MAX_USDC * 1e6));

  const sign = async (tx: string, context: string) => {
    if (!session.signOnly) throw new Error(t("Tu wallet no admite esta operación."));
    const signed = await session.signOnly(fromB64(tx));
    const r = await executePredict({ data: { wallet: wallet!, signed: toB64(signed), context } });
    if (!r.success) throw new Error(r.error);
    return r.signature;
  };
  const prepare = async () => {
    if (!wallet || !units || !valid || !livePick) return;
    setBusy("prep"); setMsg(null); setReview(null);
    try {
      const r = await preparePredictBuy({ data: { wallet, marketId: livePick.marketId, isYes: livePick.yes, amount: units.toString() } });
      if (!r.success) throw new Error(r.error);
      setReview({ pick: livePick, quote: r.quote, tx: r.transaction, context: r.context });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) }); } finally { setBusy(null); }
  };
  const confirm = async () => {
    if (!review || !wallet) return;
    setBusy("sign");
    try {
      const sig = await sign(review.tx, review.context);
      setReview(null);
      setMsg({ ok: true, text: t("Predicción confirmada. Si aciertas, cada contrato paga 1 USDC cuando el mercado se resuelva."), sig });
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
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2"><h1 className="font-display text-2xl font-bold">{t("Predicciones")}</h1><span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />{t("En vivo")}</span></div>
        <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
          <li>{t("Elige una pregunta sobre el precio de una cripto.")}</li>
          <li>{t("Toca Sí o No. El porcentaje es la probabilidad que da el mercado.")}</li>
          <li>{t("Si aciertas, cada contrato vale 1 USDC al resolverse.")}</li>
        </ol>
        <div className="mt-4 flex gap-2 overflow-x-auto" role="tablist" aria-label={t("Filtrar mercados")}>
          {([["all", t("Todos")], ["btc", "Bitcoin"], ["eth", "Ethereum"], ["other", t("Otros")]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${filter === k ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{l}</button>)}
        </div>
      </section>

      {!loaded ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={16} />{t("Buscando mercados en vivo…")}</p>
        : !shown.length ? <p className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm"><Search size={16} />{t("No hay mercados abiertos en esta categoría ahora mismo.")}</p>
        : <ul className="space-y-3">
          {shown.map((e) => {
            const open = sel === e.eventId;
            const top = e.markets[0]!;
            return <li key={e.eventId} className={`overflow-hidden rounded-2xl border bg-card transition ${open ? "border-primary" : "border-border"}`}>
              <button type="button" onClick={() => { setSel(open ? null : e.eventId); setPick(null); setReview(null); }} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
                {e.imageUrl && <img src={e.imageUrl} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-xl object-cover" />}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug">{e.title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarClock size={12} />{t("Cierra en {v}", { v: until(e.closeTime, now) })}</span><span>{t("Volumen")} {compact(e.volume)}</span><span>{t("{n} opciones", { n: e.markets.length })}</span></span>
                </span>
                {!open && e.markets.length === 1 && <span className="font-display text-xl font-bold tabular-nums text-primary">{pct(top.yes)}</span>}
              </button>
              {open && <div className="space-y-2 border-t border-border p-4">
                {e.markets.map((m) => <div key={m.marketId} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm"><span className="block font-semibold">{m.title || t("Resultado")}</span><span className="text-xs text-muted-foreground">{pct(m.yes)} {t("probabilidad")} · {compact(m.volume)}</span></span>
                  {([true, false] as const).map((yes) => {
                    const p = yes ? m.yes : m.no;
                    const on = pick?.marketId === m.marketId && pick.yes === yes;
                    return <button key={String(yes)} type="button" disabled={!p} aria-pressed={on} onClick={() => { if (p) { setPick({ marketId: m.marketId, title: `${e.title} · ${m.title}`, yes, price: p }); setReview(null); } }}
                      className={`min-w-20 rounded-xl border-2 px-2 py-1.5 text-center text-sm font-bold transition active:scale-95 disabled:opacity-40 ${on ? (yes ? "border-primary bg-primary text-primary-foreground" : "border-destructive bg-destructive text-destructive-foreground") : yes ? "border-primary/40 text-primary" : "border-destructive/40 text-destructive"}`}>
                      {t(yes ? "Sí" : "No")} {p ? `${Math.round(p * 100)}¢` : ""}
                    </button>;
                  })}
                </div>)}
                {e.rules && <details className="pt-2 text-xs text-muted-foreground"><summary className="cursor-pointer font-semibold">{t("Cómo se resuelve")}</summary><p className="mt-1 whitespace-pre-line leading-5">{e.rules}</p></details>}
              </div>}
            </li>;
          })}
        </ul>}

      {livePick && <section className="sticky bottom-24 z-10 rounded-2xl border-2 border-primary/40 bg-card p-4 shadow-lg" aria-label={t("Tu orden")}>
        <p className="text-xs text-muted-foreground">{t("Tu elección")}</p>
        <p className="font-semibold leading-snug">{livePick.title} · <span className={livePick.yes ? "text-primary" : "text-destructive"}>{t(livePick.yes ? "Sí" : "No")} {Math.round(livePick.price * 100)}¢</span></p>
        <div className="mt-3 flex items-center justify-between"><label htmlFor="predict-amount" className="text-sm font-semibold">{t("Estás poniendo (USDC)")}</label><span className="text-xs text-muted-foreground">{t("Disponible")}: <strong className="text-foreground tabular-nums">{!wallet ? "—" : balance === null ? "…" : usdc(balance)} USDC</strong></span></div>
        <input id="predict-amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setReview(null); }} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 font-display text-xl font-bold" />
        <div className="mt-2 grid grid-cols-5 gap-2">{[5, 10, 25, 50].map((v) => <Button key={v} type="button" variant="secondary" size="sm" onClick={() => { setAmount(String(v)); setReview(null); }}>{v}</Button>)}<Button type="button" variant="outline" size="sm" disabled={!maxMicro || maxMicro <= 0n} onClick={() => { if (maxMicro) { setAmount((Math.floor(Number(maxMicro) / 1e4) / 100).toFixed(2)); setReview(null); } }}>{t("Máx")}</Button></div>
        {!inRange && <p className="mt-2 text-xs text-destructive">{t("Entre {min} y {max} USDC.", { min: PREDICT_MIN_USDC, max: PREDICT_MAX_USDC })}</p>}
        {short && <p className="mt-2 text-xs text-destructive">{t("Saldo insuficiente: tienes {v} USDC.", { v: usdc(balance) })} <Link to="/wallet" className="underline">{t("Depositar o cambiar a USDC")}</Link></p>}
        {inRange && units && <div className="mt-3 space-y-1 rounded-xl bg-secondary/50 p-3 text-sm">
          <p className="flex justify-between"><span className="text-muted-foreground">{t("Pones")}</span><strong className="tabular-nums">{usdc(units)} USDC</strong></p>
          <p className="flex justify-between"><span className="text-muted-foreground">{t("Si aciertas recibes aprox.")}</span><strong className="text-primary tabular-nums">{(Number(units) / 1e6 / livePick.price).toFixed(2)} USDC</strong></p>
          <p className="flex justify-between"><span className="text-muted-foreground">{t("Ganancia posible")}</span><strong className="tabular-nums">+{(Number(units) / 1e6 / livePick.price - Number(units) / 1e6).toFixed(2)} USDC</strong></p>
        </div>}
        {!wallet ? <p className="mt-3 rounded-xl bg-secondary p-3 text-center text-sm font-semibold">{t("Entra con tu cuenta para predecir en vivo con el USDC de tu wallet.")}</p>
          : <Button disabled={!valid || !!busy} onClick={prepare} variant={livePick.yes ? "default" : "destructive"} className="mt-3 h-12 w-full rounded-xl text-base font-bold">{busy === "prep" ? <Loader2 className="animate-spin" /> : t(livePick.yes ? "Comprar Sí" : "Comprar No")}</Button>}
        <p className="mt-2 text-[11px] text-muted-foreground">{t("Verás la cifra exacta antes de firmar.")}</p>
      </section>}

      {review && <section className="space-y-2 rounded-2xl border-2 border-primary/50 bg-primary/5 p-4 text-sm" aria-label={t("Revisión")}>
        <p className="font-semibold">{t("Revisa tu predicción")} · {t(review.pick.yes ? "Sí" : "No")}</p>
        <p className="text-xs text-muted-foreground">{review.pick.title}</p>
        <p className="flex justify-between"><span>{t("Pagas")}</span><strong>{usdc(review.quote.costMicro)} USDC</strong></p>
        <p className="flex justify-between"><span>{t("Si aciertas recibes")}</span><strong className="text-primary">{usdc(review.quote.contractsMicro)} USDC</strong></p>
        <p className="flex justify-between"><span>{t("Ganancia posible")}</span><strong>+{usdc(potentialProfit(review.quote))} USDC</strong></p>
        <p className="text-xs text-muted-foreground">{t("Si no aciertas, pierdes lo que pagaste. Puedes vender antes de que se resuelva al precio del momento.")}</p>
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
            <div className="min-w-0"><p className="font-semibold">{p.title}{p.outcome ? ` · ${p.outcome}` : ""}</p><p className="text-xs text-muted-foreground">{t(p.side === "up" ? "Sí" : "No")} · {usdc(p.costMicro)} USDC · {t("Pago si aciertas")} {usdc(p.payoutMicro)}{pnl !== null ? ` · ${pnl >= 0n ? "+" : ""}${usdc(pnl)}` : ""}{!open && p.result ? ` · ${t("Resultado")}: ${p.result}` : ""}</p></div>
            {open && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => sell(p)}>{busy === p.pubkey ? <Loader2 className="animate-spin" size={14} /> : t("Vender")}</Button>}
          </div>;
        })}
      </section>}
      <p className="text-xs text-muted-foreground">{t("Las predicciones en vivo se operan en un mercado externo con USDC real; BÓVEDA no es la contraparte. El pago ganador se acredita automáticamente.")}</p>
    </div>
  );
}
