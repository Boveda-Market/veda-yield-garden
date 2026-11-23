import { Check, Copy } from "lucide-react";
import { CHAIN_POOLS } from "@/lib/solana-data";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useT } from "@/lib/i18n";
import { fetchPoolStats } from "@/lib/pool-stats";
import { poolYieldOptions } from "@/lib/pool-yield";
import type { Vault } from "@/lib/vaults";
import { formatCoinPrice } from "@/lib/format-price";

const usd = (v: number | null | undefined) => v == null ? "—" : `$${v.toLocaleString("en-US", { maximumFractionDigits: v >= 100 ? 0 : 2 })}`;
/** Short dollars for narrow cards: $4.06M, $2,795M (no «B»: in Spanish a billón is 10¹²). */
const usdShort = (v: number | null | undefined) => v == null ? "—" : v >= 1e6 ? `$${(v / 1e6).toLocaleString("en-US", { maximumFractionDigits: v >= 1e8 ? 0 : v >= 1e7 ? 1 : 2 })}M` : usd(v);
const amount = (v: number | null | undefined) => v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: v >= 100 ? 0 : 4 });

/** «Rendimiento y Mercado»: live price plus the whole pool's public metrics (no chart). */
export function MarketPerformance({ vault }: { vault: Vault }) {
  const t = useT();
  const locale = useLocale();
  const stats = useQuery({ queryKey: ["dexscreener-pool-stats", vault.pool], queryFn: ({ signal }) => fetchPoolStats(vault.pool, signal), staleTime: 60_000, retry: 1 });
  const pool = useQuery(poolYieldOptions(vault.pool));
  const m = pool.data;
  const rawSym = stats.data?.baseSymbol ?? m?.symbolX ?? vault.pair.split("/")[0];
  const symbol = rawSym ? `$${rawSym.replace(/^\$/, "")}` : rawSym;
  const coin = vault.pair.split("/")[0] ?? rawSym ?? "";
  const mint = CHAIN_POOLS.find((p) => p.id === vault.id)?.mint;
  const [copied, setCopied] = useState(false);
  const ch = stats.data?.change24h ?? null;
  const vol24h = m?.volume24h ?? stats.data?.volume24h ?? null;

  const rows: [string, string, string?][] = [
    [t("Interés anual estimado"), m?.apr != null ? `${m.apr.toLocaleString("en-US", { maximumFractionDigits: 1 })}%` : "—", t("Según intereses de 24 h")],
    [t("Dinero en el pool"), usdShort(m?.tvl), t("Todos los depósitos")],
    [t("Intereses · última hora"), m?.fees1h != null ? `+${usd(m.fees1h)}` : "—"],
    [t("Volumen · última hora"), usd(m?.volume1h)],
    [t("Intereses totales"), m?.totalFees != null ? `+${usdShort(m.totalFees)}` : "—", t("Desde que abrió el pool")],
    [t("Volumen total"), usdShort(m?.totalVolume), t("Desde que abrió el pool")],
    [t("{s} en el pool", { s: coin }), amount(m?.amountX), t("Monedas, no dólares")],
    [t("{s} en el pool", { s: m?.symbolY ?? "USDC" }), amount(m?.amountY), t("Monedas, no dólares")],
    [t("Comisión por intercambio"), m?.feePct != null ? `${m.feePct.toLocaleString("en-US", { maximumFractionDigits: 3 })}%` : "—", t("Se reparte entre los depósitos")],
    [t("Personas con {s}", { s: coin }), m?.holders != null ? m.holders.toLocaleString("en-US") : "—"],
  ];
  if (m?.createdAt) rows.push([t("Pool activo desde"), new Date(m.createdAt).toLocaleDateString(locale, { month: "short", year: "numeric" })]);

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
    <section className="rounded-2xl border border-border bg-card p-3" aria-label={t("Métricas del pool")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Métricas del pool")}</p>
      {pool.isPending ? <div role="status" className="mt-3 grid grid-cols-2 gap-2">{Array.from({ length: 6 }, (_, i) => <span key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>
        : !m ? <p role="status" className="mt-3 text-sm text-muted-foreground">{t("Métricas no disponibles por ahora")}</p>
        : <dl className="mt-3 grid grid-cols-2 gap-2">{rows.map(([k, v, s], i) =>
          <div key={`${k}-${i}`} className={`min-w-0 rounded-xl p-2.5 ${i === 0 || i === 4 ? "bg-primary/10" : "bg-muted"}`}>
            <dt className="text-[11px] leading-tight text-muted-foreground">{k}</dt>
            <dd className={`truncate font-display text-lg font-bold tabular-nums ${i === 0 || i === 4 ? "text-primary" : ""}`}>{v}</dd>
            {s && <dd className="text-[10px] leading-tight text-muted-foreground">{s}</dd>}
          </div>)}</dl>}
    </section>
    <p className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs leading-5">💡 {t("El precio de {s} sube y baja con la oferta y la demanda, pero cada intercambio genera intereses en dólares para la bóveda. La volatilidad es el motor que produce tus ganancias.", { s: symbol ?? "" })}</p>
    <p className="text-[10px] leading-4 text-muted-foreground">{t("Cifras del pool completo con datos públicos. El interés anual es una estimación simple (intereses de 24 h ÷ dinero en el pool × 365), no una ganancia garantizada. Tu parte depende de tu depósito.")}</p>
  </div>;
}
