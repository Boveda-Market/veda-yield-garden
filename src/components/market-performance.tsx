import { Check, Copy, HelpCircle } from "lucide-react";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { CHAIN_POOLS } from "@/lib/solana-data";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useT } from "@/lib/i18n";
import { fetchPoolStats, coinLabel } from "@/lib/pool-stats";
import { poolYieldOptions } from "@/lib/pool-yield";
import { poolVolatilityOptions, protocolTvlOptions, poolFlowOptions, tvlSharePct, turnoverPct } from "@/lib/pool-metrics";
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
  "Volatilidad": "Cuánto se mueve el precio de la moneda hacia arriba o hacia abajo en un día típico. Para la bóveda, el movimiento es bueno: cada vez que el precio sube o baja, la gente compra y vende, y tú cobras comisiones. Ojo: también cambia el valor de lo que tienes depositado, y si el precio se mueve mucho tu bóveda puede salir de su zona activa por un rato.",
  "Dinero en el pool": "La cantidad total de dinero que todos los participantes tienen guardado en esta bóveda. Te muestra qué tan grande es el fondo.",
  "Volumen sobre dinero": "Cuántas veces circuló el dinero durante el día. Mientras más se mueve el dinero, más comisiones genera para los depósitos, incluido el tuyo.",
  "Intercambios · 24 h": "La cantidad de compras y ventas que hicieron otras personas en las últimas 24 horas. Cada operación aporta un pedacito a tus intereses.",
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
  const volatility = useQuery(poolVolatilityOptions(vault.pool));
  const protocol = useQuery(protocolTvlOptions(vault.pool));
  const flow = useQuery(poolFlowOptions(vault.pool));
  const f = flow.data;
  const gross = f != null ? f.totalDeposits + f.totalWithdraws : 0;
  const inShare = f != null && gross > 0 ? f.totalDeposits / gross * 100 : null;
  const m = pool.data;
  const rawSym = stats.data?.baseSymbol ?? m?.symbolX ?? vault.pair.split("/")[0];
  const coin = coinLabel(rawSym, vault.pair.split("/")[0] ?? "");
  const symbol = coin ? `$${coin}` : rawSym;
  const mint = CHAIN_POOLS.find((p) => p.id === vault.id)?.mint;
  const [copied, setCopied] = useState(false);
  const [help, setHelp] = useState<{ key: string; value: string; sub?: string | undefined } | null>(null);
  const ch = stats.data?.change24h ?? null;
  const vol24h = m?.volume24h ?? stats.data?.volume24h ?? null;
  const share = tvlSharePct(m?.tvl, protocol.data);
  const turn = turnoverPct(vol24h, m?.tvl);
  const age = poolAge(m?.createdAt, t);
  const buys = stats.data?.buys24h ?? null;
  const sells = stats.data?.sells24h ?? null;
  const swaps = buys != null || sells != null ? (buys ?? 0) + (sells ?? 0) : null;
  const buyShare = swaps && buys != null ? buys / swaps * 100 : null;
  const feeShare = m?.totalFees != null && m.totalVolume != null && m.totalVolume > 0 ? m.totalFees / m.totalVolume * 100 : null;

  const rows: [string, string, string | undefined, string][] = [
    [t("Interés anual estimado"), m?.apr != null ? pct(m.apr) : "—", t("Según intereses de 24 h"), "Interés anual estimado"],
    [t("Volatilidad"), volatility.data?.volPct != null ? `±${pct(volatility.data.volPct)}` : "—", t("Movimiento diario típico"), "Volatilidad"],
    [t("Dinero en el pool"), usdShort(m?.tvl), share != null ? t("{s} de todo el dinero", { s: pct(share) }) : t("Todos los depósitos"), "Dinero en el pool"],
    [t("Volumen sobre dinero"), pct(turn), turn != null ? t("El dinero se movió {x} veces", { x: (turn / 100).toFixed(1) }) : t("Volumen de 24 h sobre el dinero"), "Volumen sobre dinero"],
    [t("Intercambios · 24 h"), count(swaps), buyShare != null ? t("{p} compras", { p: pct(buyShare) }) : t("Compras y ventas"), "Intercambios · 24 h"],
    [t("Intereses totales"), m?.totalFees != null ? `+${usdShort(m.totalFees)}` : "—", feeShare != null ? t("{p} de todo lo operado", { p: pct(feeShare) }) : t("Desde que abrió el pool"), "Intereses totales"],
    [t("Antigüedad del pool"), age ?? "—", m?.createdAt ? new Date(m.createdAt).toLocaleDateString(locale, { month: "short", year: "numeric" }) : undefined, "Antigüedad del pool"],
    [t("Comisión por intercambio"), m?.feePct != null ? pct(m.feePct) : "—", t("Se reparte entre los depósitos"), "Comisión por intercambio"],
  ];

  return <div className="space-y-3">
    <div className="grid grid-cols-3 gap-2">
      {[[`${t("Precio")} ${symbol}`, stats.data?.price != null ? formatCoinPrice(stats.data.price) : "—", ch != null ? `${ch > 0 ? "+" : ""}${ch.toFixed(1)}% · 24 h` : ""],
        [t("Volumen operado"), usdShort(vol24h), "24 h"],
        [t("Intereses generados"), m?.fees24h != null ? `+${usd(m.fees24h)}` : "—", "24 h"]].map(([k, v, s], i) =>
        <div key={k} className={`min-w-0 rounded-xl p-2.5 ${i === 2 ? "bg-primary/10" : "bg-muted"}`}><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</p><p className={`truncate font-display text-base font-bold tabular-nums ${i === 2 ? "text-primary" : ""}`}>{v}</p><p className={`truncate text-[10px] ${i === 0 && ch != null ? (ch >= 0 ? "font-bold text-primary" : "font-bold text-destructive") : "text-muted-foreground"}`}>{i === 0 && ch != null ? (ch >= 0 ? "▲ " : "▼ ") : ""}{s}</p></div>)}
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
      {pool.isPending ? <div role="status" className="mt-3 grid grid-cols-2 gap-2">{Array.from({ length: 8 }, (_, i) => <span key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>
        : !m ? <p role="status" className="mt-3 text-sm text-muted-foreground">{t("Métricas no disponibles por ahora")}</p>
        : <div className="mt-3 grid grid-cols-2 gap-2">{rows.map(([k, v, s, h], i) =>
          <button type="button" key={`${k}-${i}`} onClick={() => setHelp({ key: h, value: v, sub: s })} aria-label={`${k}: ${v}. ${t("¿Qué significa?")}`} className={`relative min-w-0 rounded-xl p-2.5 pr-6 text-left transition-colors active:scale-[0.98] ${i === 0 || i === 4 ? "bg-primary/10 hover:bg-primary/15" : "bg-muted hover:bg-muted/70"}`}>
            <HelpCircle aria-hidden size={14} className="absolute right-2 top-2 text-muted-foreground/70" />
            <span className="block text-[11px] leading-tight text-muted-foreground">{k}</span>
            <span className={`block truncate font-display text-lg font-bold tabular-nums ${i === 0 || i === 4 ? "text-primary" : ""}`}>{v}</span>
            {s && <span className="block text-[10px] leading-tight text-muted-foreground">{s}</span>}
          </button>)}</div>}
    </section>
    {m && <p className="-mt-1 text-center text-[10px] text-muted-foreground">{t("Toca una métrica para ver qué significa.")}</p>}
    <Dialog open={help != null} onOpenChange={(o) => { if (!o) setHelp(null); }}><ActionSheetContent closeLabel={t("Cerrar")}>
      {help && <>
        <DialogTitle className="pr-10 font-display text-lg">{t(help.key)}</DialogTitle>
        <div className="rounded-xl bg-muted p-3"><p className="font-display text-2xl font-bold tabular-nums">{help.value}</p>{help.sub && <p className="text-xs text-muted-foreground">{help.sub}</p>}</div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("¿Qué significa?")}</p>
        <DialogDescription className="text-base leading-7 text-foreground">{t(METRIC_HELP[help.key] ?? "")}</DialogDescription>
      </>}
    </ActionSheetContent></Dialog>
    <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-5">💡 {t("El precio de {s} sube y baja con la oferta y la demanda, pero cada intercambio genera intereses en dólares para la bóveda. La volatilidad es el motor que produce tus ganancias.", { s: symbol ?? "" })}</p>
    <p className="text-[10px] leading-4 text-muted-foreground">{t("Cifras del pool completo con datos públicos. El interés anual es una estimación simple (intereses de 24 h ÷ dinero en el pool × 365), no una ganancia garantizada. Tu parte depende de tu depósito.")}</p>
  </div>;
}
