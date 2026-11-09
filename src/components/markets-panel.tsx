import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Flame, Lock, RotateCcw, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import {
  MARKETS, MAX_LEVERAGE, MIN_LEVERAGE, MIN_STAKE, STARTING_CREDITS, fetchPrices, liquidationPrice, liquidationProximity,
  pnlOf, readMarkets, settle, validLeverage, validStake, type MarketId, type MarketsState, type Side, type TradeResult,
} from "@/lib/markets";

const num = (n: number, d = 2) => n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const priceDigits = (p: number) => (p >= 1000 ? 2 : 3);

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) return <div className="h-20" />;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const d = points.map((v, i) => `${(i / (points.length - 1)) * 100},${40 - ((v - min) / span) * 36 - 2}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className={`h-20 w-full ${up ? "text-primary" : "text-destructive"}`} aria-hidden>
      <defs><linearGradient id="spark" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.35" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,40 ${d} 100,40`} fill="url(#spark)" />
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function MarketsPanel({ identity }: { identity: string }) {
  const t = useT();
  const key = `boveda-markets-practice:${identity}`;
  const [state, setState] = useState<MarketsState>({ balance: STARTING_CREDITS, positions: [], history: [] });
  const [loaded, setLoaded] = useState(false);
  const [prices, setPrices] = useState<Partial<Record<MarketId, number>>>({});
  const [series, setSeries] = useState<Record<MarketId, number[]>>({ SOL: [], BTC: [], ETH: [] });
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [priceError, setPriceError] = useState(false);
  const [market, setMarket] = useState<MarketId>("SOL");
  const [stake, setStake] = useState("10");
  const [leverage, setLeverage] = useState(1000);
  const [result, setResult] = useState<TradeResult | null>(null);
  const prevPrice = useRef<number | undefined>(undefined);

  useEffect(() => { try { setState(readMarkets(localStorage.getItem(key))); } catch {} setLoaded(true); }, [key]);
  useEffect(() => { if (loaded) try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [loaded, key, state]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const p = await fetchPrices();
        if (!alive) return;
        setPriceError(false);
        setPrices(p);
        setSeries((s) => { const n = { ...s }; for (const m of MARKETS) if (p[m.id]) n[m.id] = [...s[m.id], p[m.id]].slice(-90); return n; });
      } catch { if (alive) setPriceError(true); }
    };
    void tick();
    const id = setInterval(tick, 1200);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const price = prices[market];
  useEffect(() => {
    if (price && prevPrice.current && price !== prevPrice.current) {
      setFlash(price > prevPrice.current ? "up" : "down");
      const id = setTimeout(() => setFlash(null), 450);
      prevPrice.current = price;
      return () => clearTimeout(id);
    }
    prevPrice.current = price;
  }, [price]);
  useEffect(() => { prevPrice.current = undefined; }, [market]);

  // Auto-liquidate positions that crossed their liquidation price.
  useEffect(() => {
    const now = Date.now();
    const hit = state.positions.filter((p) => { const px = prices[p.market]; return px && liquidationProximity(p, px) >= 1; });
    if (!hit.length) return;
    const results = hit.map((p) => settle(p, prices[p.market]!, now));
    setState((s) => ({ ...s, positions: s.positions.filter((p) => !hit.some((h) => h.id === p.id)), history: [...results, ...s.history].slice(0, 50) }));
    setResult(results[0]);
  }, [prices, state.positions]);

  const stakeNum = Number(stake);
  const canOpen = !!price && validStake(stakeNum, state.balance) && validLeverage(leverage);
  const pts = series[market];
  const change = pts.length > 1 ? ((pts[pts.length - 1] - pts[0]) / pts[0]) * 100 : 0;

  const open = (side: Side) => {
    if (!canOpen || !price) return;
    const p = { id: crypto.randomUUID(), market, side, stake: stakeNum, leverage, entry: price, openedAt: Date.now() };
    setState((s) => ({ ...s, balance: Math.round((s.balance - stakeNum) * 1e6) / 1e6, positions: [p, ...s.positions] }));
  };
  const close = (id: string) => {
    const p = state.positions.find((x) => x.id === id);
    const px = p && prices[p.market];
    if (!p || !px) return;
    const r = settle(p, px, Date.now());
    setState((s) => ({ balance: Math.round((s.balance + r.payout) * 1e6) / 1e6, positions: s.positions.filter((x) => x.id !== id), history: [r, ...s.history].slice(0, 50) }));
    setResult(r);
  };
  const reset = () => setState({ balance: STARTING_CREDITS, positions: [], history: [] });

  const exposure = Number.isFinite(stakeNum) ? stakeNum * leverage : 0;
  const stats = useMemo(() => {
    const wins = state.history.filter((h) => h.pnl > 0).length;
    return { trades: state.history.length, wins, net: state.history.reduce((s, h) => s + h.payout - h.stake, 0) };
  }, [state.history]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2"><Zap className="text-primary" size={20} /><h1 className="font-display text-2xl font-bold">{t("Mercados rápidos")}</h1><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">{t("Práctica")}</span></div>
          <div className="text-right"><p className="text-xs text-muted-foreground">{t("Créditos de práctica")}</p><p className="font-display text-xl font-bold">{num(state.balance)}</p></div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-5 pt-4" role="tablist" aria-label={t("Mercado")}>
          {MARKETS.map((m) => {
            const s = series[m.id]; const ch = s.length > 1 ? ((s[s.length - 1] - s[0]) / s[0]) * 100 : 0;
            return <button key={m.id} role="tab" aria-selected={market === m.id} onClick={() => setMarket(m.id)} className={`min-w-[7rem] rounded-xl border px-3 py-2 text-left transition ${market === m.id ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}>
              <span className="block text-sm font-bold">{m.id}</span>
              <span className={`text-xs ${ch >= 0 ? "text-primary" : "text-destructive"}`}>{ch >= 0 ? "+" : ""}{ch.toFixed(3)}%</span>
            </button>;
          })}
        </div>

        <div className="px-5 pt-5">
          <p className="text-sm text-muted-foreground">{MARKETS.find((m) => m.id === market)?.name} / USD · {t("en vivo")} <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-primary align-middle" /></p>
          <p className={`mt-1 font-display text-5xl font-bold tabular-nums transition-colors duration-300 ${flash === "up" ? "text-primary" : flash === "down" ? "text-destructive" : ""}`}>
            {price ? `$${num(price, priceDigits(price))}` : "—"}
          </p>
          {priceError && <p role="alert" className="mt-1 text-sm text-destructive">{t("Precio no disponible. Reintentando…")}</p>}
          <Sparkline points={pts} up={change >= 0} />
        </div>

        <div className="grid gap-5 border-t border-border p-5 md:grid-cols-2">
          <div>
            <label htmlFor="stake" className="text-sm font-semibold">{t("Tu apuesta (créditos)")}</label>
            <input id="stake" inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value.replace(",", "."))} className="mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 font-display text-2xl tabular-nums" />
            <div className="mt-2 flex gap-2">{[5, 10, 25, 50].map((v) => <Button key={v} type="button" size="sm" variant={stakeNum === v ? "secondary" : "outline"} onClick={() => setStake(String(v))}>{v}</Button>)}</div>
            {!validStake(stakeNum, state.balance) && <p className="mt-2 text-xs text-destructive">{t("Mínimo {min} créditos y no más de tu saldo.", { min: MIN_STAKE })}</p>}
          </div>
          <div>
            <div className="flex items-baseline justify-between"><label htmlFor="lev" className="text-sm font-semibold">{t("Multiplicador")}</label><span className="flex items-center gap-1 font-display text-2xl font-bold text-primary"><Flame size={18} />{leverage}×</span></div>
            <input id="lev" type="range" min={MIN_LEVERAGE} max={MAX_LEVERAGE} step={50} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} className="mt-4 w-full accent-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{t("Tus {stake} créditos se mueven como", { stake: num(Number.isFinite(stakeNum) ? stakeNum : 0) })} <strong className="text-foreground">{num(exposure, 0)}</strong>.</p>
            <p className="text-xs text-muted-foreground">{t("Un movimiento de {pct}% en contra pierde toda la apuesta.", { pct: ((0.98 / leverage) * 100).toFixed(3) })}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 pb-5">
          <Button disabled={!canOpen} onClick={() => open("long")} className="h-20 rounded-2xl text-xl font-bold shadow-lg transition active:scale-95"><ArrowUpRight size={26} />{t("Sube")}</Button>
          <Button disabled={!canOpen} onClick={() => open("short")} variant="destructive" className="h-20 rounded-2xl text-xl font-bold shadow-lg transition active:scale-95"><ArrowDownRight size={26} />{t("Baja")}</Button>
        </div>
      </section>

      {state.positions.length > 0 && <section aria-label={t("Posiciones abiertas")} className="space-y-3">
        <h2 className="font-display text-lg font-semibold">{t("Posiciones abiertas")}</h2>
        {state.positions.map((p) => {
          const px = prices[p.market]; const pnl = px ? pnlOf(p, px) : 0; const pct = (pnl / p.stake) * 100; const prox = px ? liquidationProximity(p, px) : 0; const up = pnl >= 0;
          return <article key={p.id} className={`rounded-2xl border bg-card p-5 transition ${up ? "border-primary/50" : "border-destructive/50"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{p.market} · <span className={p.side === "long" ? "text-primary" : "text-destructive"}>{t(p.side === "long" ? "Sube" : "Baja")}</span> · {p.leverage}×</p>
              <p className="text-xs text-muted-foreground">{t("Entrada")} ${num(p.entry, priceDigits(p.entry))} · {t("Liquidación")} ${num(liquidationPrice(p), priceDigits(p.entry))}</p>
            </div>
            <p className={`mt-3 font-display text-4xl font-bold tabular-nums ${up ? "text-primary" : "text-destructive"}`}>{up ? "+" : ""}{num(pnl)} <span className="text-lg">({up ? "+" : ""}{pct.toFixed(1)}%)</span></p>
            <div className="mt-3"><div className="flex justify-between text-xs text-muted-foreground"><span>{t("Seguro")}</span><span>{t("Riesgo de liquidación")}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full transition-all ${prox > 0.7 ? "animate-pulse bg-destructive" : prox > 0.4 ? "bg-destructive/70" : "bg-primary"}`} style={{ width: `${Math.max(3, prox * 100)}%` }} /></div></div>
            <Button onClick={() => close(p.id)} className="mt-4 w-full" variant={up ? "default" : "secondary"}>{up ? <><Trophy size={16} />{t("Cerrar y asegurar {v}", { v: num(pnl) })}</> : t("Cerrar posición")}</Button>
          </article>;
        })}
      </section>}

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("Operaciones")}</p><p className="font-display text-2xl font-bold">{stats.trades}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("Aciertos")}</p><p className="font-display text-2xl font-bold">{stats.trades ? Math.round((stats.wins / stats.trades) * 100) : 0}%</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("Resultado neto")}</p><p className={`font-display text-2xl font-bold ${stats.net >= 0 ? "text-primary" : "text-destructive"}`}>{stats.net >= 0 ? "+" : ""}{num(stats.net)}</p></div>
      </section>

      {state.history.length > 0 && <section><h2 className="mb-3 font-display text-lg font-semibold">{t("Historial")}</h2><ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {state.history.slice(0, 15).map((h) => <li key={h.id} className="flex items-center justify-between px-4 py-3 text-sm"><span>{h.market} · {t(h.side === "long" ? "Sube" : "Baja")} · {h.leverage}×{h.liquidated && <span className="ml-2 text-xs text-destructive">{t("Liquidada")}</span>}</span><span className={`font-semibold tabular-nums ${h.pnl >= 0 ? "text-primary" : "text-destructive"}`}>{h.pnl >= 0 ? "+" : ""}{num(h.payout - h.stake)}</span></li>)}
      </ul></section>}

      <section className="rounded-2xl border border-border bg-secondary/40 p-5">
        <div className="flex items-center gap-2"><Lock size={18} /><h2 className="font-semibold">{t("Con tu wallet: muy pronto")}</h2></div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Por ahora Mercados rápidos funciona solo con créditos de práctica: no se usa dinero ni se envían transacciones. Activaremos la versión con tu wallet cuando esté verificada.")}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Ganancia gratis hasta 10 créditos y cargo ficticio de 1.25% sobre el resto. Con multiplicadores tan altos, movimientos mínimos pueden hacerte perder toda la apuesta.")}</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={reset}><RotateCcw size={14} />{t("Reiniciar créditos de práctica")}</Button>
      </section>

      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="text-center">
          {result && <>
            <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${result.pnl > 0 ? "animate-bounce bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>{result.pnl > 0 ? <Trophy size={40} /> : <Flame size={40} />}</div>
            <DialogTitle className="font-display text-3xl">{result.liquidated ? t("Liquidada") : result.pnl > 0 ? t("¡Ganaste!") : t("Esta vez no")}</DialogTitle>
            <p className={`font-display text-5xl font-bold tabular-nums ${result.pnl > 0 ? "text-primary" : "text-destructive"}`}>{result.payout - result.stake >= 0 ? "+" : ""}{num(result.payout - result.stake)}</p>
            <DialogDescription>{result.market} · {t(result.side === "long" ? "Sube" : "Baja")} · {result.leverage}× · {t("Recibes {v} créditos", { v: num(result.payout) })}{result.fee > 0 ? ` · ${t("cargo ficticio")} ${num(result.fee, 4)}` : ""}</DialogDescription>
            <Button onClick={() => setResult(null)} className="w-full">{t("Otra vez")}</Button>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
