import { Loader2 } from "lucide-react";
import { useHydrated } from "@tanstack/react-router";
import { readCachedCandles } from "@/lib/pool-candles";
import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useT } from "@/lib/i18n";
import { cumulativeInterest, fetchPoolCandles, type CandleRange } from "@/lib/pool-candles";
import { fetchPoolStats } from "@/lib/pool-stats";
import { poolYieldOptions } from "@/lib/pool-yield";
import type { Vault } from "@/lib/vaults";

const W = 400, H = 300, L = 6, R = 394, TOP = 12, MID = 150, BOT = 290;
const usd = (v: number | null | undefined, d = 0) => v == null ? "—" : `$${v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d })}`;
const price = (v: number) => `$${v.toPrecision(4)}`;

function smooth(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) { const p = pts[i - 1]!, c = pts[i]!, mx = (p.x + c.x) / 2; d += ` C${mx},${p.y} ${mx},${c.y} ${c.x},${c.y}`; }
  return d;
}

/** Straight point-to-point segments: the price line stays choppy like a trading chart. */
function angular(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** «Rendimiento y Mercado»: token price (calm, top) vs. interest the pool paid (always rising, bottom). */
export function MarketPerformance({ vault }: { vault: Vault }) {
  const t = useT();
  const locale = useLocale();
  const gid = useId().replace(/:/g, "");
  const [range, setRangeRaw] = useState<CandleRange>("1h");
  useEffect(() => { try { const v = localStorage.getItem("boveda:market-range"); if (v === "1m" || v === "1h" || v === "4h" || v === "1d") setRangeRaw(v); } catch { /* ignore */ } }, []);
  const setRange = (v: CandleRange) => { setRangeRaw(v); try { localStorage.setItem("boveda:market-range", v); } catch { /* ignore */ } };
  const hydrated = useHydrated();
  const [hover, setHover] = useState<number | null>(null);
  const candles = useQuery({ queryKey: ["pool-candles", vault.pool, range], queryFn: ({ signal }) => fetchPoolCandles(vault.pool, range, signal), ...(hydrated && readCachedCandles(vault.pool, range) ? { placeholderData: readCachedCandles(vault.pool, range)! } : {}), staleTime: 30_000, refetchInterval: 30_000, retry: 1, retryDelay: 1500 });
  const stats = useQuery({ queryKey: ["dexscreener-pool-stats", vault.pool], queryFn: ({ signal }) => fetchPoolStats(vault.pool, signal), staleTime: 60_000, retry: 1 });
  const yieldQ = useQuery(poolYieldOptions(vault.pool));
  const symbol = stats.data?.baseSymbol ?? vault.pair.split("/")[0];
  const fees24h = yieldQ.data?.fees24h ?? null, vol24h = stats.data?.volume24h ?? null;
  const ratio = fees24h != null && vol24h ? fees24h / vol24h : null;
  const list = candles.data ?? [];
  const earn = ratio != null ? cumulativeInterest(list, ratio) : [];
  const rl = range === "1m" ? "5 h" : range === "1h" ? "7 d" : range === "4h" ? "30 d" : "90 d";
  const volume = list.reduce((s, c) => s + c.v, 0);
  const pill = (a: boolean) => `rounded-full px-3 py-1 text-xs font-semibold transition ${a ? "bg-foreground text-background" : "text-muted-foreground"}`;

  let chart = null;
  if (list.length >= 2) {
    const ps = list.map((c) => c.c), pmin = Math.min(...ps), pmax = Math.max(...ps), pr = Math.max(pmax - pmin, pmax * 1e-6);
    const emax = Math.max(earn[earn.length - 1] ?? 0, 1e-9);
    const x = (i: number) => L + (i / (list.length - 1)) * (R - L);
    const pPts = list.map((c, i) => ({ x: x(i), y: TOP + (1 - (c.c - pmin) / pr) * (MID - TOP - 16) }));
    const ePts = earn.map((e, i) => ({ x: x(i), y: BOT - (e / emax) * (BOT - MID - 14) }));
    const eLine = smooth(ePts);
    const a = hover ?? list.length - 1;
    chart = <>
      <p className="mt-3 text-xs text-muted-foreground">{new Date(list[a]!.t).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}</p>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div><p className="text-xs text-muted-foreground">{t("Precio de mercado")}</p><p className="font-display text-xl font-bold tabular-nums">{price(list[a]!.c)}</p></div>
        {earn.length > 0 && <div className="text-right"><p className="text-xs text-muted-foreground">{t("Intereses generados")} ↗</p><p className="font-display text-xl font-bold tabular-nums text-primary">+{usd(earn[a], 0)}</p></div>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-80 w-full" role="img" aria-label={t("Precio de {s} frente a intereses generados", { s: symbol ?? "" })}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
        <path d={angular(pPts)} fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.9" strokeWidth="1.75" strokeLinejoin="miter" strokeLinecap="butt" />
        <line x1={L} y1={MID} x2={R} y2={MID} stroke="var(--border)" strokeDasharray="3 6" />
        {eLine && <><path d={`${eLine} L${R},${BOT} L${L},${BOT} Z`} fill={`url(#${gid})`} />
          <path d={eLine} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 4px var(--primary))" }} /></>}
        <circle cx={pPts[a]!.x} cy={pPts[a]!.y} r="6" fill="var(--muted-foreground)" />
        {ePts[a] && <circle cx={ePts[a]!.x} cy={ePts[a]!.y} r="7" fill="var(--background)" stroke="var(--primary)" strokeWidth="3" />}
      </svg>
    </>;
  }

  if (!chart && (candles.isPending || candles.isFetching)) chart = <div role="status" className="flex h-80 flex-col items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-7 animate-spin text-primary" aria-hidden />{t("Cargando gráfica…")}</div>;
  return <div className="space-y-3">
    <div className="grid grid-cols-3 gap-2">
      {[[`${t("Precio")} ${symbol}`, stats.data?.price != null ? price(stats.data.price) : "—", stats.data?.change24h != null ? `${stats.data.change24h > 0 ? "+" : ""}${stats.data.change24h.toFixed(1)}% · 24 h` : ""],
        [t("Volumen operado"), usd(list.length ? volume : vol24h), rl],
        [t("Intereses generados"), earn.length ? `+${usd(earn[earn.length - 1], 0)}` : "—", rl]].map(([k, v, s], i) =>
        <div key={k} className={`min-w-0 rounded-xl p-2.5 ${i === 2 ? "bg-primary/10" : "bg-muted"}`}><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</p><p className={`truncate font-display text-base font-bold tabular-nums ${i === 2 ? "text-primary" : ""}`}>{v}</p><p className="truncate text-[10px] text-muted-foreground">{s}</p></div>)}
    </div>
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex rounded-full bg-secondary p-0.5 w-fit" role="tablist" aria-label={t("Periodo")}>{(["1m", "1h", "4h", "1d"] as const).map((r) => <button key={r} type="button" role="tab" aria-selected={range === r} onClick={() => { setRange(r); setHover(null); }} className={pill(range === r)}>{r.toUpperCase()}</button>)}</div>
      {chart ?? <div className="grid h-80 place-items-center text-sm text-muted-foreground">{candles.isPending || candles.isFetching ? <span className="h-2 w-40 animate-pulse rounded-full bg-muted" /> : t("Gráfica no disponible por ahora")}</div>}
    </div>
    <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-5">💡 {t("El precio de {s} sube y baja con la oferta y la demanda, pero cada intercambio genera intereses en dólares para la bóveda. La volatilidad es el motor que produce tus ganancias.", { s: symbol ?? "" })}</p>
    <p className="text-[10px] leading-4 text-muted-foreground">{t("Intereses del pool completo, estimados con su volumen. Tu parte depende de tu depósito.")}</p>
  </div>;
}
