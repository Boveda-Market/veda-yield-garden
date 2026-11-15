import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TokenIcon } from "@/components/token-icon";
import { PoweredBy } from "@/components/powered-by";
import { PriceChart } from "@/components/price-chart";
import { MARKETS, fetchPrices, type MarketId } from "@/lib/markets";
import { useT } from "@/lib/i18n";
import { useLiveRounds } from "@/lib/predict-rounds-query";

const short = (p: number) => (p >= 1000 ? `$${p.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}` : `$${p.toFixed(2)}`);

/** Homepage showcase of Sube/Baja with a live price line. */
export function HomePredict() {
  const t = useT();
  const [market, setMarket] = useState<MarketId>("BTC");
  const [prices, setPrices] = useState<Partial<Record<MarketId, number>>>({});
  const [series, setSeries] = useState<Record<MarketId, number[]>>({ SOL: [], BTC: [], ETH: [] });
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const p = await fetchPrices();
        if (!alive) return;
        setPrices((o) => ({ ...o, ...p }));
        setSeries((s) => { const n = { ...s }; for (const m of MARKETS) { const v = p[m.id]; if (v) n[m.id] = [...s[m.id], v].slice(-300); } return n; });
      } catch { /* retry */ }
    };
    void tick(); const id = setInterval(tick, 1500);
    return () => { alive = false; clearInterval(id); };
  }, []);
  const pts = series[market];
  // Who leads comes from the live 5 min round's market odds, the same numbers players see in Sube/Baja.
  const rounds = useLiveRounds();
  const round = (rounds.data ?? []).find((r) => r.asset === market && r.window === "5m");
  const odds = round?.upPrice && round.downPrice ? { up: round.upPrice, down: round.downPrice } : undefined;
  const up = odds ? odds.up! >= odds.down! : null;
  const steps = ["Elige tu cripto y tu ronda", "¿Sube o baja? ¡Tú decides!", "¡Acierta y cobra al cerrar la ronda!"];
  return <section className="py-12">
    <div className="flex flex-wrap items-center gap-2">
      <Zap className="text-primary" size={20} />
      <h2 className="font-display text-2xl font-bold">{t("Predice el mercado en minutos. ¿Sube o baja?")}</h2>
      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />{t("En vivo")}</span>
    </div>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Rondas de 5 min, 15 min y de 4 horas en Bitcoin, Ethereum y Solana. No compras la cripto: solo predices hacia dónde va el precio y cobras en USDC si aciertas.")}</p>
    <PoweredBy brand="polymarket" className="mt-2" />
    <div className="mt-5 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-3 gap-2 p-4" role="tablist" aria-label={t("Mercado")}>
        {MARKETS.map((m) => { const on = market === m.id, p = prices[m.id];
          return <button key={m.id} role="tab" aria-selected={on} onClick={() => setMarket(m.id)} className={`rounded-2xl border p-2.5 text-left transition ${on ? "border-primary bg-primary/10" : "border-border bg-background"}`}>
            <span className="flex items-center gap-1.5 text-sm font-bold"><TokenIcon symbol={m.id} size={22} />{m.id}</span>
            <span className="mt-1 block font-display text-sm font-semibold tabular-nums text-muted-foreground">{p ? short(p) : "—"}</span>
          </button>; })}
      </div>
      <PriceChart key={`${market}-${round?.openTime ?? 0}`} market={market} points={pts} price={prices[market]} odds={odds} />
      <div className="grid grid-cols-2 gap-3 p-4">
        <Button asChild className={`h-14 text-base font-bold ${up === false ? "opacity-80" : ""}`}><Link to="/mercados"><TrendingUp size={18} />{t("Sube")}</Link></Button>
        <Button asChild variant="destructive" className={`h-14 text-base font-bold ${up === true ? "opacity-80" : ""}`}><Link to="/mercados"><TrendingDown size={18} />{t("Baja")}</Link></Button>
      </div>
    </div>
    <ol className="mt-4 grid gap-2 sm:grid-cols-3">
      {steps.map((s, i) => <li key={s} className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm font-semibold"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>{t(s)}</li>)}
    </ol>
    <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">{t("Inicia sesión arriba para jugar en vivo.")} <a href="#acceso" className="inline-flex items-center gap-1 font-semibold text-primary">{t("Entrar")}<ArrowRight size={12} /></a></p>
  </section>;
}
