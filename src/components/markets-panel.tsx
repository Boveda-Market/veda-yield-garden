import { TokenIcon } from "@/components/token-icon";
import { PoweredBy } from "@/components/powered-by";
import { PredictHow, PredictSteps } from "@/components/predict-how";
import { PredictResults } from "@/components/predict-results";
import { useEffect, useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import { PredictLive } from "@/components/predict-live";
import { PriceChart, type OddsPoint } from "@/components/price-chart";
import { MARKETS, fetchPriceAt, fetchPrices, type MarketId } from "@/lib/markets";
import { PREDICT_WINDOWS, type LiveRound, type PredictWindow } from "@/lib/predict";
import { getLiveRounds } from "@/lib/predict.functions";
import { PendingClaims } from "@/components/pending-claims";
import { CompactOpenPredictions } from "@/components/open-predictions";

const num = (n: number, d = 2) => n.toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const digits = (p: number) => (p >= 1000 ? 2 : 3);
const short = (p: number) => p >= 1000 ? `$${(p / 1000).toFixed(1)}k` : `$${p.toFixed(2)}`;
const WIN_LABEL: Record<PredictWindow, string> = { "5m": "5 min", "15m": "15 min", "4h": "4 horas" };

/** Live-only Up/Down rounds: BTC, ETH and SOL in 5 min, 15 min and 4 hours. */
export function MarketsPanel(_: { identity: string }) {
  const t = useT();
  const [prices, setPrices] = useState<Partial<Record<MarketId, number>>>({});
  const [series, setSeries] = useState<Record<MarketId, { t: number; v: number }[]>>({ SOL: [], BTC: [], ETH: [] });
  const [market, setMarket] = useState<MarketId>("BTC");
  const [win, setWin] = useState<PredictWindow>("5m");
  const [rounds, setRounds] = useState<LiveRound[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(0);
  const [strikes, setStrikes] = useState<Record<string, number>>({});
  // Live odds history per round (asset:window:openTime), so the duel follows the same numbers as the buttons.
  const [oddsHist, setOddsHist] = useState<Record<string, OddsPoint[]>>({});

  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(id); }, []);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const p = await fetchPrices();
        if (!alive) return;
        setPrices((o) => ({ ...o, ...p }));
        setSeries((s) => { const n = { ...s }; for (const m of MARKETS) { const v = p[m.id]; if (v) n[m.id] = [...s[m.id], { t: Date.now(), v }].slice(-12000); } return n; });
      } catch { /* retry next tick */ }
    };
    void tick(); const id = setInterval(tick, 1500);
    return () => { alive = false; clearInterval(id); };
  }, []);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const r = await getLiveRounds();
      if (!alive) return;
      setRounds(r.rounds); setLoaded(true);
      setOddsHist((h) => {
        const n: Record<string, OddsPoint[]> = {}, at = Date.now();
        for (const x of r.rounds) {
          const k = `${x.asset}:${x.window}:${x.openTime}`;
          const ou = x.upPrice, od = x.downPrice;
          n[k] = ou && od ? [...(h[k] ?? []), { t: at, up: ou / (ou + od) }].slice(-4000) : (h[k] ?? []);
        }
        return n;
      });
    };
    void load(); const id = setInterval(load, 4_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const round = rounds.find((r) => r.asset === market && r.window === win && r.closeTime * 1000 > now) ?? null;
  const skey = round ? `${market}:${round.openTime}` : "";
  useEffect(() => {
    if (!round || strikes[skey]) return;
    // The opening candle may not be published yet right after a 5 min round starts: retry until it is.
    let alive = true, timer: ReturnType<typeof setTimeout> | undefined;
    const tryLoad = () => void fetchPriceAt(market, round.openTime * 1000).then((v) => {
      if (!alive) return;
      if (v) setStrikes((o) => ({ ...o, [skey]: v })); else timer = setTimeout(tryLoad, 4_000);
    });
    tryLoad();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [skey]); // eslint-disable-line react-hooks/exhaustive-deps
  const strike = strikes[skey];
  // Each round starts a fresh chart: only ticks since its opening, anchored on the new price to beat.
  const openMs = round ? round.openTime * 1000 : 0;
  const roundTicks = series[market].filter((x) => x.t >= openMs).map((x) => x.v);
  const roundPoints = strike ? [strike, ...roundTicks] : roundTicks;
  const price = prices[market];
  const remaining = round ? Math.max(0, round.closeTime * 1000 - now) : 0;
  const total = round ? (round.closeTime - round.openTime) * 1000 : 1;
  const progress = round ? Math.min(1, 1 - remaining / total) : 0;
  const s = Math.ceil(remaining / 1000);
  const ahead = price && strike ? price >= strike : null;
  const name = MARKETS.find((m) => m.id === market)?.name ?? market;

  return (
    <div className="space-y-4">
      <header className="space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Zap className="text-primary" size={20} /><h1 className="font-display text-2xl font-bold">{t("Sube o Baja")}</h1>
          <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />{t("En vivo")}</span>
          <PoweredBy brand="polymarket" className="ml-auto" />
        </div>
        <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-primary">{t("Ganas si sube, ganas si baja · Reclama tu premio cuando quieras")}</p><PredictHow /></div>
      </header>

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

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><TokenIcon symbol={market} size={22} />{t("{m} Sube o Baja {w}", { m: name, w: WIN_LABEL[win] })}</h2>
            {round && <span className="text-xs tabular-nums text-muted-foreground">{new Date(round.openTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(round.closeTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <div><p className="text-xs text-muted-foreground">{t("Precio a batir")}</p><p className="font-display text-lg font-bold tabular-nums">{strike ? `$${num(strike, digits(strike))}` : "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">{t("Precio actual")}</p>
              <p className="font-display text-lg font-bold tabular-nums">{price ? `$${num(price, digits(price))}` : "—"}</p>
              {/* Price vs our reference is shown neutrally: who leads is decided only by the market percentages below. */}
              {price && strike && <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">{ahead ? "▲" : "▼"} ${num(Math.abs(price - strike), digits(price))}</p>}</div>
            <div className="flex gap-1 text-center">{(s >= 3600 ? [[Math.floor(s / 3600), t("HORAS")], [Math.floor(s / 60) % 60, t("MIN")], [s % 60, t("SEG")]] : [[Math.floor(s / 60), t("MIN")], [s % 60, t("SEG")]]).map(([v, l]) => <div key={String(l)} className={`min-w-11 rounded-lg px-1.5 py-1 ${round && remaining < 30_000 ? "bg-destructive/15 text-destructive" : "bg-secondary"}`}><p className="font-display text-xl font-bold tabular-nums">{round ? String(v).padStart(2, "0") : "--"}</p><p className="text-[9px] font-semibold text-muted-foreground">{l}</p></div>)}</div>
          </div>
          {(() => { const diff = price && strike ? price - strike : 0; const dev = strike ? roundTicks.slice(-Math.max(2, Math.min(200, Math.ceil((now - (round?.openTime ?? 0) * 1000) / 1500)))).reduce((m, v) => Math.max(m, Math.abs(v - strike)), 0) : 0; const span = Math.max(dev, strike ? strike * 0.00005 : 1); const ou = round?.upPrice, od = round?.downPrice; const up = ou && od ? Math.max(3, Math.min(97, (ou / (ou + od)) * 100)) : 50 + Math.max(-47, Math.min(47, (diff / span) * 47)); const lead = price && strike ? (diff >= 0 ? "up" : "down") : null; return <div className="mt-3" aria-label={t("Quién va ganando")}>
            {ou && od ? <div className="mb-1 flex justify-between text-[11px] font-bold tabular-nums"><span className={ou >= od ? "text-primary" : "text-muted-foreground"}>▲ {t("Sube")} {Math.round(ou * 100)}%</span><span className={od > ou ? "text-destructive" : "text-muted-foreground"}>{t("Baja")} {Math.round(od * 100)}% ▼</span></div>
              : <div className="mb-1 flex justify-between text-[11px] font-bold tabular-nums"><span className={lead === "up" ? "text-primary" : "text-muted-foreground"}>▲ {t("Sube")}{lead === "up" && ` +$${num(Math.abs(diff), digits(price!))}`}</span><span className={lead === "down" ? "text-destructive" : "text-muted-foreground"}>{lead === "down" && `-$${num(Math.abs(diff), digits(price!))} `}{t("Baja")} ▼</span></div>}
            <div className="relative flex h-2.5 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${up}%` }} /><div className="h-full flex-1 bg-destructive" /><span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-background" /></div>
            {ou && od && lead && (lead === "up") !== (ou >= od) && <p className="mt-1.5 text-[11px] text-muted-foreground">{t("El resultado oficial usa un precio promedio, no el precio de este instante. Los porcentajes ya lo toman en cuenta.")}</p>}
          </div>; })()}
          </div>
      </section>
      {!loaded ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={16} />{t("Buscando rondas en vivo…")}</p>
        : !round && <div role="status" className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm"><Loader2 className="mt-0.5 shrink-0 animate-spin text-primary" size={16} /><p><strong>{t("Esperando la próxima ronda de {m} ({w})…", { m: name, w: WIN_LABEL[win] })}</strong><br /><span className="text-muted-foreground">{t("Abre en breve. Mientras tanto puedes probar otra duración o cripto arriba.")}</span></p></div>}
      <PredictLive round={round} chart={<div className="overflow-hidden rounded-3xl border border-border bg-card py-3"><PriceChart key={`${market}-${win}-${round?.openTime ?? 0}`} market={market} points={roundPoints} price={price} reference={strike} referenceLabel={t("A batir")} window={win} odds={round ? { up: round.upPrice, down: round.downPrice } : undefined} oddsSeries={round ? oddsHist[`${round.asset}:${round.window}:${round.openTime}`] : undefined} /></div>} />
      <PendingClaims />
      <CompactOpenPredictions />
      <details className="rounded-2xl border border-primary/30 bg-primary/5 p-4"><summary className="cursor-pointer text-sm font-semibold">💡 {t("¿Cómo jugar en 4 pasos?")}</summary><div className="mt-3"><PredictSteps /></div></details>
      <details className="rounded-2xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold">{t("Historial de rondas recientes de {m}", { m: name })}</summary><div className="mt-3"><PredictResults asset={market} window={win} /></div></details>
    </div>
  );
}
