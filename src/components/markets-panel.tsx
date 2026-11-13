import { TokenIcon } from "@/components/token-icon";
import { PoweredBy } from "@/components/powered-by";
import { PredictHow } from "@/components/predict-how";
import { PredictResults } from "@/components/predict-results";
import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { PredictLive } from "@/components/predict-live";
import { PriceChart } from "@/components/price-chart";
import { MARKETS, fetchPriceAt, fetchPrices, type MarketId } from "@/lib/markets";
import { PREDICT_WINDOWS, type LiveRound, type PredictWindow } from "@/lib/predict";
import { getLiveRounds } from "@/lib/predict.functions";
import { WalletOpenPredictions } from "@/components/open-predictions";

const num = (n: number, d = 2) => n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const digits = (p: number) => (p >= 1000 ? 2 : 3);
const short = (p: number) => p >= 1000 ? `$${(p / 1000).toFixed(1)}k` : `$${p.toFixed(2)}`;
const WIN_LABEL: Record<PredictWindow, string> = { "5m": "5 min", "15m": "15 min", "1d": "Diaria" };

/** Live-only Up/Down rounds: BTC, ETH and SOL in 5 min, 15 min and daily. */
export function MarketsPanel(_: { identity: string }) {
  const t = useT();
  const [prices, setPrices] = useState<Partial<Record<MarketId, number>>>({});
  const [series, setSeries] = useState<Record<MarketId, number[]>>({ SOL: [], BTC: [], ETH: [] });
  const [market, setMarket] = useState<MarketId>("BTC");
  const [win, setWin] = useState<PredictWindow>("5m");
  const [rounds, setRounds] = useState<LiveRound[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(0);
  const [strikes, setStrikes] = useState<Record<string, number>>({});

  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const p = await fetchPrices();
        if (!alive) return;
        setPrices((o) => ({ ...o, ...p }));
        setSeries((s) => { const n = { ...s }; for (const m of MARKETS) { const v = p[m.id]; if (v) n[m.id] = [...s[m.id], v].slice(-600); } return n; });
      } catch { /* retry next tick */ }
    };
    void tick(); const id = setInterval(tick, 1500);
    return () => { alive = false; clearInterval(id); };
  }, []);
  useEffect(() => {
    let alive = true;
    const load = async () => { const r = await getLiveRounds(); if (alive) { setRounds(r.rounds); setLoaded(true); } };
    void load(); const id = setInterval(load, 8_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const round = rounds.find((r) => r.asset === market && r.window === win && r.closeTime * 1000 > now) ?? null;
  const skey = round ? `${market}:${round.openTime}` : "";
  useEffect(() => {
    if (!round || strikes[skey]) return;
    let alive = true;
    void fetchPriceAt(market, round.openTime * 1000).then((v) => { if (alive && v) setStrikes((o) => ({ ...o, [skey]: v })); });
    return () => { alive = false; };
  }, [skey]); // eslint-disable-line react-hooks/exhaustive-deps
  const strike = strikes[skey];
  const price = prices[market];
  const remaining = round ? Math.max(0, round.closeTime * 1000 - now) : 0;
  const total = round ? (round.closeTime - round.openTime) * 1000 : 1;
  const progress = round ? Math.min(1, 1 - remaining / total) : 0;
  const s = Math.ceil(remaining / 1000);
  const ahead = price && strike ? price >= strike : null;
  const name = MARKETS.find((m) => m.id === market)?.name ?? market;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Zap className="text-primary" size={20} /><h1 className="font-display text-2xl font-bold">{t("Sube o Baja")}</h1>
          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />{t("En vivo")}</span>
          <PoweredBy brand="polymarket" className="ml-auto" />
        </div>
        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-primary">{t("Ganas si sube, ganas si baja · Reclama tu premio cuando quieras")}</p><p className="w-full text-sm text-muted-foreground">{t("Rondas en vivo de 5 min, 15 min y diarias en BTC, ETH y SOL. Al terminar el tiempo la ronda se cierra sola: si ganas, aparece tu premio para reclamar; si pierdes, desaparece.")}</p><PredictHow /></div>
      </header>


      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="px-5 pt-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><TokenIcon symbol={market} size={22} />{t("{m} Sube o Baja {w}", { m: name, w: WIN_LABEL[win] })}</h2>
            {round && <span className="text-xs tabular-nums text-muted-foreground">{new Date(round.openTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(round.closeTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <div><p className="text-xs text-muted-foreground">{t("Precio a batir")}</p><p className="font-display text-lg font-bold tabular-nums">{strike ? `$${num(strike, digits(strike))}` : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("Precio actual")}</p>
              <p className={`font-display text-lg font-bold tabular-nums ${ahead === null ? "" : ahead ? "text-primary" : "text-destructive"}`}>{price ? `$${num(price, digits(price))}` : "—"}</p>
              {price && strike && <p className={`text-[11px] font-semibold tabular-nums ${ahead ? "text-primary" : "text-destructive"}`}>{ahead ? "▲" : "▼"} ${num(Math.abs(price - strike), digits(price))}</p>}</div>
            <div className="flex gap-1 text-center">{(s >= 3600 ? [[Math.floor(s / 3600), t("HORAS")], [Math.floor(s / 60) % 60, t("MIN")], [s % 60, t("SEG")]] : [[Math.floor(s / 60), t("MIN")], [s % 60, t("SEG")]]).map(([v, l]) => <div key={String(l)} className={`min-w-11 rounded-lg px-1.5 py-1 ${round && remaining < 30_000 ? "bg-destructive/15 text-destructive" : "bg-secondary"}`}><p className="font-display text-xl font-bold tabular-nums">{round ? String(v).padStart(2, "0") : "--"}</p><p className="text-[9px] font-semibold text-muted-foreground">{l}</p></div>)}</div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className={`h-full transition-all ${ahead === false ? "bg-destructive" : "bg-primary"}`} style={{ width: `${progress * 100}%` }} /></div>
          {ahead !== null && <p className={`mt-2 text-xs font-semibold ${ahead ? "text-primary" : "text-destructive"}`}>{t(ahead ? "Ahora mismo va ganando Sube" : "Ahora mismo va ganando Baja")}</p>}
        </div>
        <div className="mt-3 pb-3"><PriceChart market={market} points={series[market]} price={price} reference={strike} referenceLabel={t("A batir")} /></div>
      </section>
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label={t("Mercado")}>
        {MARKETS.map((m) => {
          const on = market === m.id, p = prices[m.id];
          return <button key={m.id} role="tab" aria-selected={on} onClick={() => setMarket(m.id)} className={`flex items-center justify-center rounded-full border px-2 py-1.5 transition ${on ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold"><TokenIcon symbol={m.id} size={18} />{m.id}</span>
            <span className="ml-1 font-display text-xs font-semibold tabular-nums text-muted-foreground">{p ? short(p) : "—"}</span>
          </button>;
        })}
      </div>
      <div className="grid grid-cols-3 gap-1.5 rounded-full border border-border bg-muted p-1" role="tablist" aria-label={t("Duración de la ronda")}>
        {PREDICT_WINDOWS.map((w) => <button key={w} role="tab" aria-selected={win === w} onClick={() => setWin(w)} className={`rounded-full border py-1.5 text-sm font-bold transition ${win === w ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card text-foreground hover:border-primary/60"}`}>{t(WIN_LABEL[w])}</button>)}
      </div>

      {!loaded ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={16} />{t("Buscando rondas en vivo…")}</p>
        : !round && <div role="status" className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm"><Loader2 className="mt-0.5 shrink-0 animate-spin text-primary" size={16} /><p><strong>{t("Esperando la próxima ronda de {m} ({w})…", { m: name, w: WIN_LABEL[win] })}</strong><br /><span className="text-muted-foreground">{t("Abre en breve. Mientras tanto puedes probar otra duración o cripto arriba.")}</span></p></div>}
      <PredictLive round={round} />
      <WalletOpenPredictions />
      <details className="rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold">{t("Historial de rondas recientes de {m}", { m: name })}</summary><div className="mt-3"><PredictResults asset={market} window={win} /></div></details>
    </div>
  );
}
