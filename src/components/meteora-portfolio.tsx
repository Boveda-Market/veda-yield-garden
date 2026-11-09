import { useT } from "@/lib/i18n";
import { useInfiniteQuery, useQueries } from "@tanstack/react-query";
import { fetchPoolStats } from "@/lib/pool-stats";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, RefreshCw } from "lucide-react";
import { getMeteoraHistory } from "@/lib/meteora-history.functions";
import { harvestedUsdValue, meteoraMetrics } from "@/lib/meteora-history";
import { tokenAmount, type ChainPosition } from "@/lib/solana-data";
import { Button } from "./ui/button";

const names = { deposit: "Depósito de liquidez", withdraw: "Retiro de liquidez", harvest: "Comisiones cosechadas", close: "Posición cerrada" };
export function MeteoraPortfolio({ wallet, positions }: { wallet: string | null; positions: ChainPosition[] }) {
  const t = useT();
  const read = useServerFn(getMeteoraHistory);
  const query = useInfiniteQuery({ queryKey: ["meteora-history", wallet], initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => { if (!wallet) throw new Error(t("Conecta tu wallet")); const result = await read({ data: { wallet, before: pageParam } }); if (!result.success) throw new Error(result.error); return result.page; },
    getNextPageParam: (last) => last.missing === 0 ? last.next ?? undefined : undefined,
    enabled: Boolean(wallet), staleTime: 60_000, retry: false, maxPages: 8 });
  const pages = query.data?.pages ?? [];
  const records = [...new Map(pages.flatMap((page) => page.records).map((row) => [row.id, row])).values()].sort((a, b) => b.slot - a.slot);
  const metrics = meteoraMetrics(records);
  const missing = pages.reduce((sum, page) => sum + page.missing, 0);
  const format = (value: string) => `${value} USDC`;
  const priced = metrics.totals.filter((p) => p.id !== "rwa");
  const priceQueries = useQueries({ queries: priced.map((p) => ({ queryKey: ["dexscreener-pool-stats", p.pool], queryFn: ({ signal }: { signal: AbortSignal }) => fetchPoolStats(p.pool, signal), staleTime: 60_000, retry: 1 })) });
  const prices = Object.fromEntries(priced.map((p, i) => { const s = priceQueries[i]?.data; return [p.id, s && s.baseSymbol.toUpperCase().includes(p.symbol) ? s.price : null]; }));
  const pnl = pages.length > 0 ? harvestedUsdValue(metrics.totals, prices) : null;
  const ready = pages.length > 0;
  const withdrawn = tokenAmount(metrics.totals.reduce((sum, pool) => sum + pool.withdrawUsdc, 0n).toString(), 6);
  const depositCount = records.filter((row) => row.kind === "deposit").length;
  const withdrawCount = records.filter((row) => row.kind === "withdraw").length;
  return <div>
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">{t("Tus resultados")}</h2><Button size="icon" variant="outline" title={t("Actualizar registros del pool")} aria-label={t("Actualizar registros del pool")} disabled={!wallet || query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} /></Button></div>
    <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-5">{[
      [t("Ganancias (PNL)"), pnl ? `$${pnl}` : t("No disponible")],
      [`Total depositado · ${depositCount} ${depositCount === 1 ? t("depósito") : t("depósitos")}`, ready ? format(metrics.deposited) : t("No disponible")],
      [`Total retirado · ${withdrawCount} ${withdrawCount === 1 ? "retiro" : "retiros"}`, ready ? format(withdrawn) : t("No disponible")],
      [t("Comisiones cobradas"), ready ? format(metrics.harvested) : t("No disponible")],
      [t("Ganancia sobre lo depositado"), ready && metrics.usdcHarvestPercent !== null ? `${metrics.usdcHarvestPercent}%` : t("No disponible")],
    ].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 break-words font-display text-xl">{value}</p></div>)}</div>
    <p className="mt-5 text-xs leading-5 text-muted-foreground">{t("Totales en USDC de tus movimientos confirmados. Tus depósitos y retiros también incluyen SOL o MET, que verás abajo por bóveda. Las ganancias suman tus comisiones cobradas al precio actual; no incluyen cambios de precio de tu capital ni cargos.")}</p>
    {!wallet && <p className="mt-4 text-muted-foreground">{t("Conecta tu wallet para consultar tus registros.")}</p>}
    {query.isFetching && <p role="status" className="mt-4 text-sm">{t("Consultando registros del pool…")}</p>}
    {query.isError && <p role="alert" className="mt-4 text-sm text-destructive">{t("No pudimos cargar todos los registros. Los resultados anteriores se conservan; intenta actualizar.")}</p>}
    {ready && <p className="mt-4 text-xs text-muted-foreground">{metrics.count} {t("eventos en")}{" "}{pages.reduce((sum, page) => sum + page.scanned, 0)} {t("transacciones revisadas.")}{" "}{query.hasNextPage ? t("Hay movimientos anteriores por consultar.") : t("Fin de las páginas consultadas; no garantiza incluir cuentas de tokens, delegados o posiciones transferidas.")} {missing > 0 && `${missing} transacciones no pudieron verificarse; los totales son parciales.`} {t("Solo se suman los registros cargados. SPCX no se incluye.")}</p>}
    {metrics.totals.filter((pool) => pool.count > 0 || positions.some((p) => p.vaultId === pool.id)).map((pool) => <div key={pool.id} className="mt-6 border-y border-border py-4"><h3 className="font-semibold">{pool.symbol}/USDC</h3><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-muted-foreground">{t("Comisiones cosechadas · brutas")}</dt><dd>{tokenAmount(pool.harvestToken.toString(), pool.id === "sol" ? 9 : 6)} {pool.symbol} + {tokenAmount(pool.harvestUsdc.toString(), 6)} USDC</dd></div><div><dt className="text-muted-foreground">{t("Liquidez aportada · registros cargados")}</dt><dd>{tokenAmount(pool.depositToken.toString(), pool.id === "sol" ? 9 : 6)} {pool.symbol} + {tokenAmount(pool.depositUsdc.toString(), 6)} USDC</dd></div><div><dt className="text-muted-foreground">{t("Liquidez retirada · no es ganancia")}</dt><dd>{tokenAmount(pool.withdrawToken.toString(), pool.id === "sol" ? 9 : 6)} {pool.symbol} + {tokenAmount(pool.withdrawUsdc.toString(), 6)} USDC</dd></div></dl></div>)}
    <h3 className="mt-8 font-display text-lg font-semibold">{t("Movimientos en bóvedas")}</h3>
    {ready && records.length === 0 && <p className="mt-4 text-sm text-muted-foreground">{t("No hay eventos SOL/MET en las transacciones revisadas.")}</p>}
    {records.map((row) => { const pool = metrics.totals.find((p) => p.pool === row.pool); if (!pool) return null; return <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4"><div className="min-w-0"><p className="text-sm font-semibold">{names[row.kind]} · {pool.symbol}/USDC</p><p className="mt-1 text-xs text-muted-foreground">{row.at ? new Date(row.at).toLocaleString("es-PR") : t("Fecha no disponible")}</p>{row.kind !== "close" && <p className="mt-2 break-words text-sm">{tokenAmount(row.tokenRaw, pool.id === "sol" ? 9 : 6)} {pool.symbol} + {tokenAmount(row.usdcRaw, 6)} USDC</p>}</div><Button asChild size="sm" variant="outline"><a href={`https://orbmarkets.io/tx/${row.signature}`} target="_blank" rel="noopener noreferrer">{t("Comprobante")}<ExternalLink size={14} /></a></Button></article>; })}
    {query.hasNextPage && pages.length < 8 && <Button className="mt-5" variant="outline" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>{t("Consultar movimientos anteriores")}</Button>}
    {pages.length >= 8 && <p className="mt-4 text-xs text-muted-foreground">{t("Límite de consulta: 200 transacciones para mantener la aplicación ligera. Estos totales no representan todo tu historial.")}</p>}
  </div>;
}