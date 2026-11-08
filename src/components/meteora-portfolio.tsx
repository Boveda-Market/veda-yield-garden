import { useInfiniteQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, RefreshCw } from "lucide-react";
import { getMeteoraHistory } from "@/lib/meteora-history.functions";
import { meteoraMetrics } from "@/lib/meteora-history";
import { tokenAmount, type ChainPosition } from "@/lib/solana-data";
import { Button } from "./ui/button";

const names = { deposit: "Depósito de liquidez", withdraw: "Retiro de liquidez", harvest: "Comisiones cosechadas", close: "Posición cerrada" };
export function MeteoraPortfolio({ wallet, positions }: { wallet: string | null; positions: ChainPosition[] }) {
  const read = useServerFn(getMeteoraHistory);
  const query = useInfiniteQuery({ queryKey: ["meteora-history", wallet], initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => { if (!wallet) throw new Error("Conecta tu wallet"); const result = await read({ data: { wallet, before: pageParam } }); if (!result.success) throw new Error(result.error); return result.page; },
    getNextPageParam: (last) => last.missing === 0 ? last.next ?? undefined : undefined,
    enabled: Boolean(wallet), staleTime: 60_000, retry: false, maxPages: 8 });
  const pages = query.data?.pages ?? [];
  const records = [...new Map(pages.flatMap((page) => page.records).map((row) => [row.id, row])).values()].sort((a, b) => b.slot - a.slot);
  const metrics = meteoraMetrics(records);
  const missing = pages.reduce((sum, page) => sum + page.missing, 0);
  const format = (value: string) => `${value} USDC`;
  const ready = pages.length > 0;
  return <div>
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">Tus resultados en Meteora</h2><Button size="icon" variant="outline" title="Actualizar registros de Meteora" aria-label="Actualizar registros de Meteora" disabled={!wallet || query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} /></Button></div>
    <div className="mt-6 grid grid-cols-2 gap-6 lg:grid-cols-4">{[
      ["Ganancias / pérdidas (PNL)", "No disponible"],
      ["USDC aportados al pool", ready ? format(metrics.deposited) : "No disponible"],
      ["Comisiones USDC cosechadas · brutas", ready ? format(metrics.harvested) : "No disponible"],
      ["Porcentaje cosechado · parte USDC", ready && metrics.usdcHarvestPercent !== null ? `${metrics.usdcHarvestPercent}%` : "No disponible"],
    ].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 break-words font-display text-xl">{value}</p></div>)}</div>
    <p className="mt-5 text-xs leading-5 text-muted-foreground">Importes de los eventos oficiales de Meteora confirmados definitivamente en Solana, para SOL/MET. Los USDC aportados no incluyen el valor del otro token ni el coste total de tu depósito. El porcentaje compara solo comisiones USDC brutas con USDC aportados; no es la rentabilidad total. No descuenta el cargo de BÓVEDA, red ni conversiones. PNL no disponible sin coste completo y valoración de ambos tokens.</p>
    {!wallet && <p className="mt-4 text-muted-foreground">Conecta tu wallet para consultar tus registros.</p>}
    {query.isFetching && <p role="status" className="mt-4 text-sm">Consultando registros de Meteora…</p>}
    {query.isError && <p role="alert" className="mt-4 text-sm text-destructive">No pudimos cargar todos los registros. Los resultados anteriores se conservan; intenta actualizar.</p>}
    {ready && <p className="mt-4 text-xs text-muted-foreground">{metrics.count} eventos en {pages.reduce((sum, page) => sum + page.scanned, 0)} transacciones revisadas. {query.hasNextPage ? "Hay movimientos anteriores por consultar." : "Fin de las páginas consultadas; no garantiza incluir cuentas de tokens, delegados o posiciones transferidas."} {missing > 0 && `${missing} transacciones no pudieron verificarse; los totales son parciales.`} Solo se suman los registros cargados. SPCX no se incluye.</p>}
    {metrics.totals.filter((pool) => pool.count > 0 || positions.some((p) => p.vaultId === pool.id)).map((pool) => <div key={pool.id} className="mt-6 border-y border-border py-4"><h3 className="font-semibold">{pool.symbol}/USDC</h3><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-muted-foreground">Comisiones cosechadas · brutas</dt><dd>{tokenAmount(pool.harvestToken.toString(), pool.id === "sol" ? 9 : 6)} {pool.symbol} + {tokenAmount(pool.harvestUsdc.toString(), 6)} USDC</dd></div><div><dt className="text-muted-foreground">Liquidez aportada · registros cargados</dt><dd>{tokenAmount(pool.depositToken.toString(), pool.id === "sol" ? 9 : 6)} {pool.symbol} + {tokenAmount(pool.depositUsdc.toString(), 6)} USDC</dd></div><div><dt className="text-muted-foreground">Liquidez retirada · no es ganancia</dt><dd>{tokenAmount(pool.withdrawToken.toString(), pool.id === "sol" ? 9 : 6)} {pool.symbol} + {tokenAmount(pool.withdrawUsdc.toString(), 6)} USDC</dd></div></dl></div>)}
    <h3 className="mt-8 font-display text-lg font-semibold">Movimientos de Meteora</h3>
    {ready && records.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No hay eventos SOL/MET en las transacciones revisadas.</p>}
    {records.map((row) => { const pool = metrics.totals.find((p) => p.pool === row.pool); if (!pool) return null; return <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4"><div className="min-w-0"><p className="text-sm font-semibold">{names[row.kind]} · {pool.symbol}/USDC</p><p className="mt-1 text-xs text-muted-foreground">{row.at ? new Date(row.at).toLocaleString("es-PR") : "Fecha no disponible"}</p>{row.kind !== "close" && <p className="mt-2 break-words text-sm">{tokenAmount(row.tokenRaw, pool.id === "sol" ? 9 : 6)} {pool.symbol} + {tokenAmount(row.usdcRaw, 6)} USDC</p>}</div><Button asChild size="sm" variant="outline"><a href={`https://solscan.io/tx/${row.signature}`} target="_blank" rel="noopener noreferrer">Comprobante<ExternalLink size={14} /></a></Button></article>; })}
    {query.hasNextPage && pages.length < 8 && <Button className="mt-5" variant="outline" disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>Consultar movimientos anteriores</Button>}
    {pages.length >= 8 && <p className="mt-4 text-xs text-muted-foreground">Límite de consulta: 200 transacciones para mantener la aplicación ligera. Estos totales no representan todo tu historial.</p>}
  </div>;
}