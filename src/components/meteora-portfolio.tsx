import { useT } from "@/lib/i18n";
import { vaultDecimals } from "@/lib/solana-data";
import { ChevronDown, ArrowDownLeft, ArrowUpRight, ExternalLink, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { useMeteoraHistory } from "@/hooks/use-meteora-history";
import { tokenAmount, type ChainPosition } from "@/lib/solana-data";
import { Button } from "./ui/button";
import { useState } from "react";

const names = { deposit: "Depósito", withdraw: "Retiro", harvest: "Cosecha de ganancias", close: "Posición cerrada" };
type Kind = keyof typeof names;
const styles: Record<Kind, { Icon: typeof Sparkles; tone: string; sign: string }> = {
  deposit: { Icon: ArrowDownLeft, tone: "bg-primary/10 text-primary", sign: "" },
  harvest: { Icon: Sparkles, tone: "bg-accent text-accent-foreground", sign: "+" },
  withdraw: { Icon: ArrowUpRight, tone: "bg-secondary text-secondary-foreground", sign: "" },
  close: { Icon: XCircle, tone: "bg-muted text-muted-foreground", sign: "" },
};
const matches = (filter: string, kind: string, auto?: boolean) => filter === "all" || (filter === "auto" ? !!auto : kind === filter || (filter === "withdraw" && kind === "close"));
function dayLabel(at: number | string | null | undefined, t: (s: string) => string) {
  if (!at) return t("Fecha no disponible");
  const d = new Date(at), today = new Date(), y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return t("Hoy");
  if (d.toDateString() === y.toDateString()) return t("Ayer");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}
export function MeteoraPortfolio({ wallet, positions }: { wallet: string | null; positions: ChainPosition[] }) {
  const t = useT();
  const [filter, setFilter] = useState<"all" | "deposit" | "harvest" | "withdraw" | "auto">("all");
  const { query, pages, records, metrics, ready, missing, scanned } = useMeteoraHistory(wallet);
  const dec = vaultDecimals;
  return <details className="group rounded-2xl border border-border bg-card p-4">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden"><h2 className="font-display text-lg font-semibold">{t("Movimientos en bóvedas")}</h2><ChevronDown size={18} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden /></summary>
    <div className="mt-3 flex justify-end"><Button size="icon" variant="outline" title={t("Actualizar registros del pool")} aria-label={t("Actualizar registros del pool")} disabled={!wallet || query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button></div>
    <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label={t("Filtrar movimientos")}>{([["all", t("Todos")], ["deposit", t("Depósitos")], ["harvest", t("Cosechas")], ["withdraw", t("Retiros")], ["auto", t("Piloto automático")]] as const).map(([id, label]) => { const count = records.filter((r) => matches(id, r.kind, r.auto)).length; return <Button key={id} size="sm" variant={filter === id ? "secondary" : "ghost"} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label} <span className="text-xs text-muted-foreground">({count})</span></Button>; })}</div>
    {!wallet && <p className="mt-4 text-muted-foreground">{t("Conecta tu wallet para consultar tus registros.")}</p>}
    {query.isFetching && !ready && <p role="status" className="mt-4 text-sm">{t("Consultando registros del pool…")}</p>}
    {query.isError && <p role="alert" className="mt-4 text-sm text-destructive">{t("No pudimos cargar todos los registros. Los resultados anteriores se conservan; intenta actualizar.")}</p>}
    {ready && records.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{t("Aún no tienes movimientos en bóvedas.")}</p>}
    {(() => { let lastGroup = ""; return records.filter((row) => matches(filter, row.kind, row.auto)).map((row) => { const pool = metrics.totals.find((p) => p.pool === row.pool); if (!pool) return null; const group = dayLabel(row.at, t); const header = group !== lastGroup; lastGroup = group; const s = styles[row.kind]; const Icon = s.Icon; return <div key={row.id}>{header && <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>}<article className="flex items-center gap-3 border-b border-border py-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${s.tone}`}><Icon size={18} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{row.auto ? t("⚡ Auto-Compound · Piloto Automático") : t(names[row.kind])}</p><p className="text-xs text-muted-foreground">{t("Bóveda")} {pool.symbol} · {row.at ? new Date(row.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : t("Fecha no disponible")}</p></div><div className="text-right">{row.kind !== "close" ? <><p className={`text-sm font-semibold ${row.kind === "harvest" ? "text-primary" : ""}`}>{s.sign}{tokenAmount(row.usdcRaw, 6)} USDC</p><p className="text-xs text-muted-foreground">{s.sign}{tokenAmount(row.tokenRaw, pool.id === "sol" ? 9 : 6)} {pool.symbol}</p></> : <p className="text-xs text-muted-foreground">{t("Posición cerrada")}</p>}<a className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline" href={`https://orbmarkets.io/tx/${row.signature}`} target="_blank" rel="noopener noreferrer">{t("Comprobante")}<ExternalLink size={11} /></a></div></article></div>; }); })()}
    {query.hasNextPage && pages.length < 8 && <Button className="mt-5" variant="outline" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{t("Consultar movimientos anteriores")}</Button>}
    <details className="mt-8 rounded-2xl border border-border bg-card p-4">
      <summary className="cursor-pointer text-sm font-semibold">{t("Desglose y cómo se calcula")}</summary>
    {metrics.totals.filter((pool) => pool.count > 0 || positions.some((p) => p.vaultId === pool.id)).map((pool) => <details key={pool.id} className="mt-3 rounded-xl border border-border bg-background p-3"><summary className="flex cursor-pointer items-center justify-between font-semibold"><span>{t("Bóveda")} {pool.symbol}</span><span className="text-xs font-normal text-muted-foreground">{t("Ver desglose")}</span></summary><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-muted-foreground">{t("Intereses cosechadas · brutas")}</dt><dd>{tokenAmount(pool.harvestToken.toString(), dec(pool.id))} {pool.symbol} + {tokenAmount(pool.harvestUsdc.toString(), 6)} USDC</dd></div><div><dt className="text-muted-foreground">{t("Liquidez aportada · registros cargados")}</dt><dd>{tokenAmount(pool.depositToken.toString(), dec(pool.id))} {pool.symbol} + {tokenAmount(pool.depositUsdc.toString(), 6)} USDC</dd></div><div><dt className="text-muted-foreground">{t("Liquidez retirada · no es ganancia")}</dt><dd>{tokenAmount(pool.withdrawToken.toString(), dec(pool.id))} {pool.symbol} + {tokenAmount(pool.withdrawUsdc.toString(), 6)} USDC</dd></div></dl></details>)}
      <ul className="mt-4 list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
        <li>{t("Ganancias cobradas = intereses cosechadas (USDC más tokens al precio actual). No incluye cambios de precio de tu capital.")}</li>
        <li>{t("Valores en dólares estimados al precio actual; pueden cambiar antes de firmar.")}</li>
        {ready && <li>{metrics.count} {t("eventos en")}{" "}{scanned} {t("transacciones revisadas.")}{" "}{query.hasNextPage ? t("Hay movimientos anteriores por consultar.") : t("Fin de las páginas consultadas; no garantiza incluir cuentas de tokens, delegados o posiciones transferidas.")}</li>}
        {missing > 0 && <li>{t("{n} transacciones no pudieron verificarse; los totales son parciales.", { n: String(missing) })}</li>}
        {pages.length >= 8 && <li>{t("Límite de consulta: 200 transacciones para mantener la aplicación ligera. Estos totales no representan todo tu historial.")}</li>}
        <li>{t("Solo se suman los registros cargados.")}</li>
      </ul>
    </details>
  </details>;
}
