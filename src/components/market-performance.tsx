import { Check, Copy } from "lucide-react";
import { MetricHelpGrid, type MetricTile } from "@/components/metric-help";
import { CHAIN_POOLS } from "@/lib/solana-data";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useT } from "@/lib/i18n";
import { fetchPoolStats, coinLabel, tokenLiquidityOptions } from "@/lib/pool-stats";
import { poolYieldOptions } from "@/lib/pool-yield";
import { protocolTvlOptions, poolDiscoveryOptions, tvlSharePct } from "@/lib/pool-metrics";
import type { Vault } from "@/lib/vaults";
import { formatCoinPrice } from "@/lib/format-price";

const usd = (v: number | null | undefined) => v == null ? "—" : `$${v.toLocaleString("en-US", { maximumFractionDigits: v >= 100 ? 0 : 2 })}`;
/** Short dollars for narrow cards: $4.06M, $2,795M (no «B»: in Spanish a billón is 10¹²). */
const usdShort = (v: number | null | undefined) => v == null ? "—" : v >= 1e6 ? `$${(v / 1e6).toLocaleString("en-US", { maximumFractionDigits: v >= 1e8 ? 0 : v >= 1e7 ? 1 : 2 })}M` : usd(v);
/** Same short dollars, but always showing whether it came in or went out. */
const signedUsdShort = (v: number | null | undefined) => v == null ? "—" : `${v >= 0 ? "+" : "-"}${usdShort(Math.abs(v))}`;
/** Percent with the decimals a small screen can still read: 0.04%, 3.2%, 364%. */
const pct = (v: number | null | undefined) => v == null ? "—" : `${v.toLocaleString("en-US", { maximumFractionDigits: v < 1 ? 2 : v < 10 ? 1 : 0 })}%`;
/** Whole number with thousands separators: 6,871. */
const count = (v: number | null | undefined) => v == null ? "—" : Math.round(v).toLocaleString("en-US");

/** How long the pool has been open, in the unit a person actually reads. */
function poolAge(createdAt: number | null | undefined, t: (s: string, v?: Record<string, string | number>) => string) {
  if (!createdAt) return null;
  const days = Math.floor((Date.now() - createdAt) / 86_400_000);
  if (days < 0) return null;
  if (days < 60) return t("{n} días", { n: Math.max(days, 1) });
  const months = Math.round(days / 30.44);
  if (months < 24) return t("{n} meses", { n: months });
  return t("{n} años", { n: Number((months / 12).toFixed(1)) });
}

/** Plain-language «¿Qué significa?» text for each pool metric, shown in a bottom sheet. */
const METRIC_HELP: Record<string, string> = {
  "Interés anual estimado": "Un cálculo aproximado de cuánto ganarías en un año si la actividad de hoy se mantuviera igual. No es una promesa fija: varía según el movimiento del mercado.",
  "Volatilidad": "Cuánto se movió el precio de la moneda hacia arriba o hacia abajo en las últimas 24 horas. Para la bóveda, el movimiento es bueno: cada vez que el precio sube o baja, la gente compra y vende, y tú cobras comisiones. Ojo: también cambia el valor de lo que tienes depositado, y si el precio se mueve mucho tu bóveda puede salir de su zona activa por un rato.",
  "Dinero en el pool": "La cantidad total de dinero que todos los participantes tienen guardado en esta bóveda. Te muestra qué tan grande es el fondo.",
  "Dinero trabajando": "La parte del dinero del pool que está justo en la zona de precio donde ocurren los intercambios ahora mismo. Solo ese dinero cobra comisiones en este momento.",
  "Volumen sobre dinero trabajando": "Cuántas veces circuló el dinero que está trabajando durante las últimas 24 horas. Mientras más alto, más comisiones recibe cada dólar que está en la zona activa.",
  "Personas que operaron": "Cuántas billeteras distintas compraron o vendieron en esta bóveda en las últimas 24 horas. Más personas significa más actividad y más comisiones.",
  "Posiciones abiertas": "Cuántos depósitos de todas las personas hay abiertos en este pool. «En zona activa» son los que ahora mismo están cobrando comisiones.",
  "Intercambios · 24 h": "La cantidad de compras y ventas que hicieron otras personas en las últimas 24 horas. Cada operación aporta un pedacito a tus intereses.",
  "Intereses generados": "Lo que esta bóveda generó en intereses para todos sus participantes en las últimas 24 horas.",
  "Intereses totales": "Todas las comisiones que esta bóveda ha generado para sus participantes desde el primer día que abrió.",
  "Antigüedad del pool": "El tiempo que lleva esta bóveda funcionando de forma pública. Más tiempo significa más historial para revisar.",
  "Comisión por intercambio": "El pequeño porcentaje que paga quien entra a cambiar monedas. Ese cobro no se lo queda un banco: se reparte entre los depósitos como el tuyo.",
};

/** «Rendimiento y Mercado»: live price plus the whole pool's public metrics (no chart). */
export function MarketPerformance({ vault }: { vault: Vault }) {
  const t = useT();
  const locale = useLocale();
  const stats = useQuery({ queryKey: ["dexscreener-pool-stats", vault.pool], queryFn: ({ signal }) => fetchPoolStats(vault.pool, signal), staleTime: 60_000, retry: 1 });
  const pool = useQuery(poolYieldOptions(vault.pool));
  const protocol = useQuery(protocolTvlOptions(vault.pool));
  const discovery = useQuery(poolDiscoveryOptions(vault.pool));
  const f = discovery.data?.flow ?? null;
  const live = discovery.data?.pulse ?? null;
  const gross = f != null ? f.totalDeposits + f.totalWithdraws : 0;
  const inShare = f != null && gross > 0 ? f.totalDeposits / gross * 100 : null;
  const m = pool.data;
  const rawSym = stats.data?.baseSymbol ?? m?.symbolX ?? vault.pair.split("/")[0];
  const coin = coinLabel(rawSym, vault.pair.split("/")[0] ?? "");
  const symbol = coin ? `$${coin}` : rawSym;
  const mint = CHAIN_POOLS.find((p) => p.id === vault.id)?.mint;
  const [copied, setCopied] = useState(false);
  const liquidity = useQuery({ ...tokenLiquidityOptions(mint ?? ""), enabled: !!mint });
  const liq = liquidity.data;
  const ch = stats.data?.change24h ?? null;
  const share = tvlSharePct(m?.tvl, protocol.data);
  const age = poolAge(m?.createdAt, t);
  const buys = stats.data?.buys24h ?? null;
  const sells = stats.data?.sells24h ?? null;
  const swaps = buys != null || sells != null ? (buys ?? 0) + (sells ?? 0) : null;
  const buyShare = swaps && buys != null ? buys / swaps * 100 : null;
  const feeShare = m?.totalFees != null && m.totalVolume != null && m.totalVolume > 0 ? m.totalFees / m.totalVolume * 100 : null;

  // Figures and percents as meteora.ag shows them for this exact pool (24 h vs. the previous 24 h).
  const tiles: MetricTile[] = [
    { label: t("Interés anual estimado"), value: m?.apr != null ? pct(m.apr) : "—", sub: t("Según intereses de 24 h"), help: "Interés anual estimado", accent: true, wide: true },
    { label: t("Volatilidad"), value: live?.volatility != null ? `±${pct(live.volatility)}` : "—", sub: t("Últimas 24 horas"), help: "Volatilidad" },
    { label: t("Dinero en el pool"), value: usdShort(m?.tvl), sub: share != null ? t("{s} de todo el dinero", { s: pct(share) }) : t("Todos los depósitos"), help: "Dinero en el pool" },
    { label: t("Dinero trabajando"), value: usdShort(live?.activeTvl), sub: t("En la zona activa"), change: live?.activeTvlChange, help: "Dinero trabajando" },
    { label: t("Volumen sobre dinero trabajando"), value: pct(live?.volumeActiveTvl), sub: live?.volumeActiveTvl != null ? t("El dinero se movió {x} veces", { x: (live.volumeActiveTvl / 100).toFixed(1) }) : t("Últimas 24 horas"), change: live?.volumeActiveTvlChange, help: "Volumen sobre dinero trabajando" },
    { label: t("Intercambios · 24 h"), value: count(live?.swaps ?? swaps), sub: buyShare != null ? t("{p} compras", { p: pct(buyShare) }) : t("Compras y ventas"), change: live?.swapsChange, help: "Intercambios · 24 h" },
    { label: t("Personas que operaron"), value: count(live?.traders), sub: t("Últimas 24 horas"), change: live?.tradersChange, help: "Personas que operaron" },
    { label: t("Posiciones abiertas"), value: count(live?.openPositions), sub: live?.inRangePositions != null && live.inRangePct != null ? t("{n} en zona activa ({p})", { n: live.inRangePositions, p: pct(live.inRangePct) }) : t("De todas las personas"), help: "Posiciones abiertas" },
    { label: t("Intereses generados"), value: m?.fees24h != null ? `+${usd(m.fees24h)}` : "—", sub: t("Últimas 24 horas"), change: live?.feesChange, help: "Intereses generados", accent: true },
    { label: t("Antigüedad del pool"), value: age ?? "—", sub: m?.createdAt ? new Date(m.createdAt).toLocaleDateString(locale, { month: "short", year: "numeric" }) : undefined, help: "Antigüedad del pool" },
    { label: t("Comisión por intercambio"), value: m?.feePct != null ? pct(m.feePct) : "—", sub: t("Se reparte entre los depósitos"), help: "Comisión por intercambio" },
  ];

  return <div className="space-y-3">
    <div className="grid grid-cols-3 gap-2">
      {[[`${t("Precio")} ${symbol}`, stats.data?.price != null ? formatCoinPrice(stats.data.price) : "—", ch != null ? `${ch > 0 ? "+" : ""}${ch.toFixed(1)}% · 24 h` : ""],
        [t("Liquidez total"), liq ? usdShort(liq.totalUsd) : "—", liq ? t("En {n} mercados", { n: liq.markets }) : t("Todos sus mercados")],
        [t("Intereses totales"), m?.totalFees != null ? `+${usdShort(m.totalFees)}` : "—", feeShare != null ? t("{p} de todo lo operado", { p: pct(feeShare) }) : t("Desde que abrió el pool")]].map(([k, v, s], i) =>
        <div key={k} className={`min-w-0 rounded-xl p-2.5 ${i >= 1 ? "bg-primary/10" : "bg-muted"}`}><p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">{k}</p><p className={`truncate font-display text-base font-bold tabular-nums ${i >= 1 ? "text-primary" : ""}`}>{v}</p><p className={`text-[10px] leading-tight ${i === 0 && ch != null ? (ch >= 0 ? "font-bold text-primary" : "font-bold text-destructive") : "text-muted-foreground"}`}>{i === 0 && ch != null ? (ch >= 0 ? "▲ " : "▼ ") : ""}{s}</p></div>)}
    </div>
    {mint && <button type="button" onClick={() => { void navigator.clipboard.writeText(mint).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); }} aria-label={t("Copiar contrato")} className="flex w-full items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-left">
      <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Contrato oficial:")} {symbol}</p><p className="break-all font-mono text-[11px] leading-4">{mint}</p></div>
      {copied ? <Check size={16} className="shrink-0 text-primary" /> : <Copy size={16} className="shrink-0 text-muted-foreground" />}
    </button>}
    {f && <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Depósitos netos")}</p>
        <p className={`font-display text-lg font-bold tabular-nums ${f.netDeposits >= 0 ? "text-primary" : "text-destructive"}`}>{signedUsdShort(f.netDeposits)}</p>
      </div>
      {inShare != null && <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-muted" aria-label={t("Dinero que entró y salió del pool")}><div className="bg-primary transition-all" style={{ width: `${inShare}%` }} /><div className="flex-1 bg-destructive" /></div>}
      <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{t("Entraron {a} · Salieron {b}", { a: usdShort(f.totalDeposits), b: usdShort(f.totalWithdraws) })}</p>
    </div>}
    <section className="rounded-2xl border border-border bg-card p-3" aria-label={t("Métricas del pool")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Métricas del pool")}</p>
      {pool.isPending ? <div role="status" className="mt-3 grid grid-cols-2 gap-2">{Array.from({ length: 10 }, (_, i) => <span key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>
        : !m ? <p role="status" className="mt-3 text-sm text-muted-foreground">{t("Métricas no disponibles por ahora")}</p>
        : <div className="mt-3"><MetricHelpGrid tiles={tiles.map((x) => ({ ...x, help: x.help ? METRIC_HELP[x.help] : undefined }))} /></div>}
    </section>
    {m && <p className="-mt-1 text-center text-[10px] text-muted-foreground">{t("Toca una métrica para ver qué significa.")}</p>}
    <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-5">💡 {t("El precio de {s} sube y baja con la oferta y la demanda, pero cada intercambio genera intereses en dólares para la bóveda. La volatilidad es el motor que produce tus ganancias.", { s: symbol ?? "" })}</p>
    <p className="text-[10px] leading-4 text-muted-foreground">{t("Cifras del pool completo con datos públicos. El interés anual es una estimación simple (intereses de 24 h ÷ dinero en el pool × 365), no una ganancia garantizada. Tu parte depende de tu depósito.")}</p>
  </div>;
}
