import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useT } from "@/lib/i18n";
import { cumulativeInterest, fetchPoolCandles, type CandleRange } from "@/lib/pool-candles";
import { fetchPoolStats } from "@/lib/pool-stats";
import { poolYieldOptions } from "@/lib/pool-yield";
import type { Vault } from "@/lib/vaults";

const W = 720, H = 260, L = 8, R = 712, TOP = 16, MID = 150, BOT = 244;
const usd = (v: number | null | undefined, d = 0) => v == null ? "—" : `$${v.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d })}`;
const price = (v: number) => `$${v.toPrecision(4)}`;

function smooth(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 1; i < pts.length; i++) { const p = pts[i - 1]!, c = pts[i]!, mx = (p.x + c.x) / 2; d += ` C${mx},${p.y} ${mx},${c.y} ${c.x},${c.y}`; }
  return d;
}

/** «Rendimiento y Mercado»: token price (calm, top) vs. interest the pool paid (always rising, bottom). */
export function MarketPerformance({ vault }: { vault: Vault }) {
  const t = useT();
  const locale = useLocale();
  const gid = useId().replace(/:/g, "");
  const [range, setRange] = useState<CandleRange>("24h");
  const [hover, setHover] = useState<number | null>(null);
  const candles = useQuery({ queryKey: ["pool-candles", vault.pool, range], queryFn: ({ signal }) => fetchPoolCandles(vault.pool, range, signal), staleTime: 5 * 60_000, retry: 1 });
  const stats = useQuery({ queryKey: ["dexscreener-pool-stats", vault.pool], queryFn: ({ signal }) => fetchPoolStats(vault.pool, signal), staleTime: 60_000, retry: 1 });
  const yieldQ = useQuery(poolYieldOptions(vault.pool));
  const symbol = stats.data?.baseSymbol ?? vault.pair.split("/")[0];
  const fees24h = yieldQ.data?.fees24h ?? null, vol24h = stats.data?.volume24h ?? null;
  const ratio = fees24h != null && vol24h ? fees24h / vol24h : null;
  const list = candles.data ?? [];
  const earn = ratio != null ? cumulativeInterest(list, ratio) : [];
  const volume = list.reduce((s, c) => s + c.v, 0);
  const pill = (a: boolean) => `rounded-full px-3 py-1 text-xs font-semibold transition ${a ? "bg-foreground text-background" : "text-muted-foreground"}`;

  let chart = null;
  if (list.length >= 2) {
    const ps = list.map((c) => c.c), pmin = Math.min(...ps), pmax = Math.max(...ps), pr = Math.max(pmax - pmin, pmax * 1e-6);
    const emax = Math.max(earn[earn.length - 1] ?? 0, 1e-9);
    const x = (i: number) => L + (i / (list.length - 1)) * (R - L);
    const pPts = list.map((c, i) => ({ x: x(i), y: TOP + (1 - (c.c - pmin) / pr) * (MID - TOP - 20) }));
    const ePts = earn.map((e, i) => ({ x: x(i), y: BOT - (e / emax) * (BOT - MID - 10) }));
    const eLine = smooth(ePts);
    const a = hover ?? list.length - 1;
    const onMove = (ev: React.PointerEvent<SVGSVGElement>) => { const r = ev.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(list.length - 1, Math.round(((ev.clientX - r.left) / r.width * W - L) / (R - L) * (list.length - 1))))); };
    chart = <>
      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{new Date(list[a]!.t).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}</span>
        <span className="tabular-nums"><span className="text-muted-foreground">{symbol} </span><strong>{price(list[a]!.c)}</strong>{earn.length > 0 && <> · <span className="font-semibold text-primary">+{usd(earn[a], 0)} {t("en intereses")}</span></>}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-56 w-full touch-none" role="img" aria-label={t("Precio de {s} frente a intereses generados", { s: symbol ?? "" })} onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></linearGradient></defs>
        <text x={L} y={TOP + 4} fill="var(--muted-foreground)" fontSize="12">{t("Precio de mercado")}</text>
        <path d={smooth(pPts)} fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
        <line x1={L} y1={MID} x2={R} y2={MID} stroke="var(--border)" strokeDasharray="3 6" />
        {eLine && <><text x={L} y={MID + 16} fill="var(--primary)" fontSize="12" fontWeight="600">{t("Intereses generados")} ↗</text>
          <path d={`${eLine} L${R},${BOT} L${L},${BOT} Z`} fill={`url(#${gid})`} />
          <path d={eLine} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 4px var(--primary))" }} /></>}
        <line x1={x(a)} y1={TOP} x2={x(a)} y2={BOT} stroke="var(--muted-foreground)" strokeOpacity="0.5" strokeDasharray="4 4" />
        <circle cx={pPts[a]!.x} cy={pPts[a]!.y} r="4" fill="var(--muted-foreground)" />
        {ePts[a] && <circle cx={ePts[a]!.x} cy={ePts[a]!.y} r="5" fill="var(--background)" stroke="var(--primary)" strokeWidth="3" />}
      </svg>
    </>;
  }

  return <div className="space-y-3">
    <div className="grid grid-cols-3 gap-2">
      {[[`${t("Precio")} ${symbol}`, stats.data?.price != null ? price(stats.data.price) : "—", stats.data?.change24h != null ? `${stats.data.change24h > 0 ? "+" : ""}${stats.data.change24h.toFixed(1)}% · 24 h` : ""],
        [t("Volumen operado"), usd(list.length ? volume : vol24h), range === "24h" ? "24 h" : "7 d"],
        [t("Intereses generados"), earn.length ? `+${usd(earn[earn.length - 1], 0)}` : "—", range === "24h" ? "24 h" : "7 d"]].map(([k, v, s], i) =>
        <div key={k} className={`min-w-0 rounded-xl p-2.5 ${i === 2 ? "bg-primary/10" : "bg-muted"}`}><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</p><p className={`truncate font-display text-base font-bold tabular-nums ${i === 2 ? "text-primary" : ""}`}>{v}</p><p className="truncate text-[10px] text-muted-foreground">{s}</p></div>)}
    </div>
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex rounded-full bg-secondary p-0.5 w-fit" role="tablist" aria-label={t("Periodo")}>{(["24h", "7d"] as const).map((r) => <button key={r} type="button" role="tab" aria-selected={range === r} onClick={() => { setRange(r); setHover(null); }} className={pill(range === r)}>{r === "24h" ? "24 h" : "7 d"}</button>)}</div>
      {chart ?? <div className="grid h-56 place-items-center text-sm text-muted-foreground">{candles.isPending ? <span className="h-2 w-40 animate-pulse rounded-full bg-muted" /> : t("Gráfica no disponible por ahora")}</div>}
    </div>
    <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-5">💡 {t("El precio de {s} sube y baja con la oferta y la demanda, pero cada intercambio genera intereses en dólares para la bóveda. La volatilidad es el motor que produce tus ganancias.", { s: symbol ?? "" })}</p>
    <p className="text-[10px] leading-4 text-muted-foreground">{t("Intereses del pool completo, estimados con su volumen. Tu parte depende de tu depósito.")}</p>
  </div>;
}
