import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Clock, Lock, RotateCcw, Timer, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import { PredictLive } from "@/components/predict-live";
import { PriceChart } from "@/components/price-chart";
import { ShareWin } from "@/components/share-win";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import {
  MARKETS, MIN_STAKE, PAYOUT_MULTIPLE, STARTING_CREDITS, WINDOWS, fetchPriceAt, fetchPrices, readMarkets, resolve, roundOf, validStake,
  type MarketId, type MarketsState, type PredictionResult, type Side, type WindowId,
} from "@/lib/markets";

const num = (n: number, d = 2) => n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const priceDigits = (p: number) => (p >= 1000 ? 2 : 3);
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export function MarketsPanel({ identity }: { identity: string }) {
  const t = useT();
  const key = `boveda-predictions-practice:${identity}`;
  const [state, setState] = useState<MarketsState>({ balance: STARTING_CREDITS, open: [], history: [] });
  const [loaded, setLoaded] = useState(false);
  const [prices, setPrices] = useState<Partial<Record<MarketId, number>>>({});
  const [series, setSeries] = useState<Record<MarketId, number[]>>({ SOL: [], BTC: [], ETH: [] });
  const [priceError, setPriceError] = useState(false);
  const [market, setMarket] = useState<MarketId>("BTC");
  const [win, setWin] = useState<WindowId>("5m");
  const [stake, setStake] = useState("10");
  const [now, setNow] = useState(0);
  const [results, setResults] = useState<PredictionResult[]>([]);
  const settling = useRef(new Set<string>());
  const session = useBovedaSession();
  const hasWallet = !!session.walletAddress;
  const [mode, setMode] = useState<"live" | "practice">("practice");
  useEffect(() => { setMode(hasWallet ? "live" : "practice"); }, [hasWallet]);
  const [day, setDay] = useState<Partial<Record<MarketId, { open: number; high: number; low: number }>>>({});
  useEffect(() => {
    let alive = true;
    const load = () => MARKETS.forEach(async (m) => {
      try {
        const r = await fetch(`https://api.exchange.coinbase.com/products/${m.id}-USD/stats`);
        const j = await r.json() as { open?: string; high?: string; low?: string };
        const open = Number(j.open), high = Number(j.high), low = Number(j.low);
        if (alive && open > 0 && high > 0 && low > 0) setDay((d) => ({ ...d, [m.id]: { open, high, low } }));
      } catch { /* stats optional */ }
    });
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => { try { setState(readMarkets(localStorage.getItem(key))); } catch {} setLoaded(true); }, [key]);
  useEffect(() => { if (loaded) try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [loaded, key, state]);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const p = await fetchPrices();
        if (!alive) return;
        setPriceError(false);
        setPrices((old) => ({ ...old, ...p }));
        setSeries((s) => { const n = { ...s }; for (const m of MARKETS) { const v = p[m.id]; if (v) n[m.id] = [...s[m.id], v].slice(-600); } return n; });
      } catch { if (alive) setPriceError(true); }
    };
    void tick();
    const id = setInterval(tick, 1500);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Settle rounds that ended: live price if just ended, historical candle if ended a while ago.
  useEffect(() => {
    if (!loaded || !now) return;
    const due = state.open.filter((p) => p.endsAt <= now && !settling.current.has(p.id));
    for (const p of due) {
      const late = now - p.endsAt > 15_000;
      const live = prices[p.market];
      if (!late && !live) continue;
      settling.current.add(p.id);
      void (async () => {
        const close = late ? await fetchPriceAt(p.market, p.endsAt) : live!;
        if (!close) { settling.current.delete(p.id); return; }
        const r = resolve(p, close);
        setState((s) => s.open.some((x) => x.id === p.id)
          ? { balance: Math.round((s.balance + r.payout) * 1e6) / 1e6, open: s.open.filter((x) => x.id !== p.id), history: [r, ...s.history].slice(0, 50) }
          : s);
        if (!late) setResults((rs) => [...rs, r]);
      })();
    }
  }, [now, loaded, state.open, prices]);

  const price = prices[market];
  const round = now ? roundOf(win, now) : null;
  const winMs = WINDOWS.find((w) => w.id === win)!.ms;
  const stakeNum = Number(stake);
  const canEnter = !!price && !!round?.entryOpen && validStake(stakeNum, state.balance);
  const mine = state.open.filter((p) => p.market === market && p.window === win && round && p.endsAt === round.end);
  const lock = mine[0]?.lock;
  const pts = series[market];
  const roundStart = round?.start;
  const [opens, setOpens] = useState<Record<string, number>>({});
  const openKey = `${market}:${roundStart}`;
  useEffect(() => {
    if (!roundStart || opens[openKey]) return;
    let alive = true;
    void fetchPriceAt(market, roundStart).then((v) => { if (alive && v) setOpens((o) => ({ ...o, [openKey]: v })); });
    return () => { alive = false; };
  }, [openKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const roundOpen = opens[openKey];
  const recent = pts.slice(-60);
  let ups = 0, downs = 0;
  for (let i = 1; i < recent.length; i++) { if (recent[i]! > recent[i - 1]!) ups++; else if (recent[i]! < recent[i - 1]!) downs++; }
  const upShare = ups + downs ? Math.round((ups / (ups + downs)) * 100) : 50;
  const d24 = day[market];
  const ch24 = d24 && price ? ((price - d24.open) / d24.open) * 100 : null;
  const live = mode === "live";

  const enter = (side: Side) => {
    if (!canEnter || !price || !round) return;
    const p = { id: crypto.randomUUID(), market, window: win, side, stake: stakeNum, lock: price, placedAt: now, endsAt: round.end };
    setState((s) => ({ ...s, balance: Math.round((s.balance - stakeNum) * 1e6) / 1e6, open: [p, ...s.open] }));
  };
  const reset = () => { setState({ balance: STARTING_CREDITS, open: [], history: [] }); setResults([]); };

  const stats = useMemo(() => {
    const wins = state.history.filter((h) => h.outcome === "win").length;
    return { trades: state.history.length, wins, net: state.history.reduce((s, h) => s + h.payout - h.stake, 0) };
  }, [state.history]);
  const result = results[0] ?? null;
  const progress = round ? 1 - round.remaining / winMs : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1" role="tablist" aria-label={t("Modo de mercados")}>
        {([["live", t("En vivo (USDC)")], ["practice", t("Práctica (créditos)")]] as const).map(([k, label]) => <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`rounded-xl py-2.5 text-sm font-semibold transition ${mode === k ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>{label}</button>)}
      </div>
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
          <div className="flex items-center gap-2"><Zap className="text-primary" size={20} /><h1 className="font-display text-2xl font-bold">{t("Predicciones")}</h1><span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">{live ? t("En vivo") : t("Práctica")}</span></div>
          {!live && <div className="text-right"><p className="text-xs text-muted-foreground">{t("Créditos de práctica")}</p><p className="font-display text-xl font-bold">{num(state.balance)}</p></div>}
        </div>
        <ol className="mx-5 mt-2 list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
          <li>{t("Elige cuánto quieres poner.")}</li>
          <li>{t("Toca Sube si crees que Bitcoin terminará más alto o Baja si crees que terminará más bajo.")}</li>
          <li>{live ? t("Si aciertas, el pago llega solo a tu wallet al cerrar la ronda.") : t("Si aciertas, ganas créditos de práctica al cerrar la ronda.")}</li>
        </ol>

        <div className="flex gap-2 overflow-x-auto px-5 pt-4" role="tablist" aria-label={t("Mercado")}>
          {MARKETS.map((m) => <button key={m.id} role="tab" aria-selected={market === m.id} onClick={() => setMarket(m.id)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${market === m.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{m.name}</button>)}
        </div>
        <div className="grid grid-cols-5 gap-2 px-5 pt-3" role="tablist" aria-label={t("Duración de la ronda")}>
          {WINDOWS.map((w) => <button key={w.id} role="tab" aria-selected={win === w.id} onClick={() => setWin(w.id)} className={`rounded-xl border py-2 text-sm font-semibold transition ${win === w.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{w.label}</button>)}
        </div>

        {live ? <div className="px-5 pt-5">
          <div className="flex items-center gap-2"><h2 className="font-display text-lg font-bold">{t("{m} Sube o Baja {w}", { m: market, w: WINDOWS.find((w) => w.id === win)?.label ?? win })}</h2><span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />{t("En vivo")}</span></div>
          {round && <p className="text-xs text-muted-foreground tabular-nums">{new Date(round.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(round.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <div><p className="text-xs text-muted-foreground">{t("Precio a batir")}</p><p className="font-display text-lg font-bold tabular-nums">{roundOpen ? `$${num(roundOpen, priceDigits(roundOpen))}` : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("Precio actual")}</p><p className={`font-display text-lg font-bold tabular-nums ${price && roundOpen ? (price >= roundOpen ? "text-primary" : "text-destructive") : ""}`}>{price ? `$${num(price, priceDigits(price))}` : "—"}</p>{price && roundOpen && <p className={`text-[11px] font-semibold tabular-nums ${price >= roundOpen ? "text-primary" : "text-destructive"}`}>{price >= roundOpen ? "▲" : "▼"} ${num(Math.abs(price - roundOpen), priceDigits(price))}</p>}</div>
            <div className="flex gap-1 text-center">{(() => { const s = round ? Math.max(0, Math.ceil(round.remaining / 1000)) : 0; return [[Math.floor(s / 60), t("MIN")], [s % 60, t("SEG")]].map(([v, l]) => <div key={String(l)} className="min-w-11 rounded-lg bg-secondary px-1.5 py-1"><p className="font-display text-xl font-bold tabular-nums">{String(v).padStart(2, "0")}</p><p className="text-[9px] font-semibold text-muted-foreground">{l}</p></div>); })()}</div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} /></div>
        </div> : <div className="px-5 pt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{MARKETS.find((m) => m.id === market)?.name} / USD · {t("en vivo")} <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-primary align-middle" /></p>
              <p className="font-display whitespace-nowrap text-3xl font-bold tabular-nums">{price ? `$${num(price, priceDigits(price))}` : "—"}</p>
              {ch24 !== null && <p className={`text-sm font-semibold tabular-nums ${ch24 >= 0 ? "text-primary" : "text-destructive"}`}>{ch24 >= 0 ? "+" : ""}{ch24.toFixed(2)}% · 24h</p>}
              {!live && lock && price && <p className={`text-sm font-semibold tabular-nums ${price >= lock ? "text-primary" : "text-destructive"}`}>{t("Precio fijado")} ${num(lock, priceDigits(lock))} · {price >= lock ? "▲" : "▼"} ${num(Math.abs(price - lock), priceDigits(lock))}</p>}
            </div>
            {live ? <div className="text-right text-xs tabular-nums text-muted-foreground">{d24 && <><p>{t("Máx 24h")} <strong className="text-foreground">${num(d24.high, priceDigits(d24.high))}</strong></p><p>{t("Mín 24h")} <strong className="text-foreground">${num(d24.low, priceDigits(d24.low))}</strong></p></>}</div> : <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><Timer size={14} />{t("Termina en")}</p>
              <p className={`font-display text-3xl font-bold tabular-nums ${round && !round.entryOpen ? "text-destructive" : ""}`}>{round ? clock(round.remaining) : "--:--"}</p>
            </div>}
          </div>
          {priceError && <p role="alert" className="mt-1 text-sm text-destructive">{t("Precio no disponible. Reintentando…")}</p>}
          {!live && <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} /></div>}
        </div>}
        <div className="mt-4"><PriceChart market={market} points={pts} price={price} reference={lock ?? roundOpen} referenceLabel={lock ? t("Tu precio") : live ? t("A batir") : t("Inicio")} /></div>

        <div className="px-5 pt-3" aria-label={t("Impulso reciente")}>
          <div className="flex justify-between text-xs font-semibold"><span className="text-primary">▲ {upShare}% {t("al alza")}</span><span className="text-muted-foreground">{t("Impulso reciente")}</span><span className="text-destructive">{100 - upShare}% {t("a la baja")} ▼</span></div>
          <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-destructive/70"><div className="h-full bg-primary transition-all duration-700" style={{ width: `${upShare}%` }} /></div>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("Basado en los últimos movimientos del precio, no en apuestas de otros usuarios.")}</p>
        </div>

        {live ? <div className="p-5"><PredictLive market={market} window={win} momentum={upShare} price={price ?? null} start={roundOpen ?? null} /></div> : <div className="space-y-4 p-5">
          <div>
            <label htmlFor="stake" className="text-sm font-semibold">{t("Tu predicción (créditos)")}</label>
            <input id="stake" inputMode="decimal" value={stake} onChange={(e) => setStake(e.target.value.replace(/[^0-9.]/g, ""))} className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 font-display text-xl font-bold" />
            <div className="mt-2 grid grid-cols-5 gap-2">{[5, 10, 25, 50].map((v) => <Button key={v} type="button" variant="secondary" size="sm" onClick={() => setStake(String(v))}>{v}</Button>)}<Button type="button" variant="secondary" size="sm" onClick={() => setStake(String(Math.floor(state.balance)))}>{t("Máx")}</Button></div>
            {!validStake(stakeNum, state.balance) && <p className="mt-2 text-xs text-destructive">{t("Mínimo {min} créditos y no más de tu saldo.", { min: MIN_STAKE })}</p>}
            <p className="mt-2 text-sm text-muted-foreground">{t("Si aciertas recibes")} <strong className="text-foreground">{num((Number.isFinite(stakeNum) ? stakeNum : 0) * PAYOUT_MULTIPLE)}</strong> ({PAYOUT_MULTIPLE}×)</p>
          </div>
          {round && !round.entryOpen && <p className="flex items-center gap-2 rounded-xl bg-secondary p-3 text-sm"><Clock size={16} />{t("Entradas cerradas para esta ronda. La próxima abre en {v}.", { v: clock(round.remaining) })}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Button disabled={!canEnter} onClick={() => enter("up")} className="h-20 flex-col rounded-2xl text-xl font-bold shadow-lg transition active:scale-95"><span className="flex items-center gap-1"><ArrowUpRight size={26} />{t("Sube")}</span><span className="text-xs font-medium opacity-80">{PAYOUT_MULTIPLE}×</span></Button>
            <Button disabled={!canEnter} onClick={() => enter("down")} variant="destructive" className="h-20 flex-col rounded-2xl text-xl font-bold shadow-lg transition active:scale-95"><span className="flex items-center gap-1"><ArrowDownRight size={26} />{t("Baja")}</span><span className="text-xs font-medium opacity-80">{PAYOUT_MULTIPLE}×</span></Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("Tu precio queda fijado al entrar. Al terminar la ronda, si el precio está a tu favor, ganas.")}</p>
        </div>}
      </section>

      {!live && <>
      {state.open.length > 0 && <section aria-label={t("Predicciones activas")} className="space-y-3">
        <h2 className="font-display text-lg font-semibold">{t("Predicciones activas")}</h2>
        {state.open.map((p) => {
          const px = prices[p.market];
          const winning = px ? (p.side === "up" ? px > p.lock : px < p.lock) : false;
          return <div key={p.id} className={`rounded-2xl border-2 p-4 ${winning ? "border-primary/60 bg-primary/5" : "border-destructive/50 bg-destructive/5"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{p.market} · {WINDOWS.find((w) => w.id === p.window)?.label} · {t(p.side === "up" ? "Sube" : "Baja")} · {num(p.stake)}</p>
                <p className="text-xs text-muted-foreground">{t("Precio fijado")} ${num(p.lock, priceDigits(p.lock))}{px ? ` · ${t("Actual")} $${num(px, priceDigits(px))}` : ""}</p>
              </div>
              <div className="text-right"><p className="font-display text-xl font-bold tabular-nums">{clock(p.endsAt - now)}</p><p className={`text-xs font-semibold ${winning ? "text-primary" : "text-destructive"}`}>{px === p.lock ? t("Empate") : winning ? t("Vas ganando") : t("Vas perdiendo")}</p></div>
            </div>
          </div>;
        })}
      </section>}

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("Rondas")}</p><p className="font-display text-2xl font-bold">{stats.trades}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("Aciertos")}</p><p className="font-display text-2xl font-bold">{stats.trades ? Math.round((stats.wins / stats.trades) * 100) : 0}%</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{t("Resultado neto")}</p><p className={`font-display text-2xl font-bold ${stats.net >= 0 ? "text-primary" : "text-destructive"}`}>{stats.net >= 0 ? "+" : ""}{num(stats.net)}</p></div>
      </section>

      {state.history.length > 0 && <section><h2 className="mb-3 font-display text-lg font-semibold">{t("Historial")}</h2><ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {state.history.slice(0, 15).map((h) => <li key={h.id} className="flex items-center justify-between px-4 py-3 text-sm"><span>{h.market} · {WINDOWS.find((w) => w.id === h.window)?.label} · {t(h.side === "up" ? "Sube" : "Baja")}<span className="block text-xs text-muted-foreground">${num(h.lock, priceDigits(h.lock))} → ${num(h.close, priceDigits(h.close))}</span></span><span className={`font-semibold tabular-nums ${h.outcome === "win" ? "text-primary" : h.outcome === "loss" ? "text-destructive" : ""}`}>{h.payout - h.stake >= 0 ? "+" : ""}{num(h.payout - h.stake)}</span></li>)}
      </ul></section>}

      <section className="rounded-2xl border border-border bg-secondary/40 p-5">
        <div className="flex items-center gap-2"><Lock size={18} /><h2 className="font-semibold">{t("Rondas de práctica")}</h2></div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("Las rondas por tiempo usan solo créditos de práctica: no se usa dinero ni se envían transacciones.")}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Ganancia gratis hasta 10 créditos y cargo ficticio de 1.25% sobre el resto. Si el precio termina igual, recuperas tu predicción.")}</p>
        <Button variant="ghost" size="sm" className="mt-3" onClick={reset}><RotateCcw size={14} />{t("Reiniciar créditos de práctica")}</Button>
      </section>
      </>}

      <Dialog open={!!result} onOpenChange={(o) => { if (!o) setResults((rs) => rs.slice(1)); }}>
        {result && <DialogContent className="text-center">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${result.outcome === "win" ? "bg-primary/15 text-primary" : "bg-secondary"}`}>{result.outcome === "win" ? <Trophy size={32} /> : <Clock size={32} />}</div>
          <DialogTitle className="font-display text-3xl">{result.outcome === "win" ? t("¡Acertaste!") : result.outcome === "tie" ? t("Empate") : t("Esta vez no")}</DialogTitle>
          <DialogDescription>{result.market} · {t(result.side === "up" ? "Sube" : "Baja")} · ${num(result.lock, priceDigits(result.lock))} → ${num(result.close, priceDigits(result.close))} · {t("Recibes {v} créditos", { v: num(result.payout) })}{result.fee > 0 ? ` · ${t("cargo ficticio")} ${num(result.fee)}` : ""}</DialogDescription>
          {result.outcome === "win" && <ShareWin headline={t("¡Acerté! +{v} créditos", { v: num(result.payout - result.stake) })} />}
          <Button onClick={() => setResults((rs) => rs.slice(1))}>{t("Siguiente ronda")}</Button>
        </DialogContent>}
      </Dialog>
    </div>
  );
}
