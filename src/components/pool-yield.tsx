import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { poolYieldOptions } from "@/lib/pool-yield";

const money = (value: number | null | undefined) => value == null ? "—" : `$${value.toLocaleString("es-MX", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

export function PoolYield({ address }: { address: string }) {
  const query = useQuery(poolYieldOptions(address));
  const apr = query.data?.apr;
  return <div className="mt-5" aria-label="Rendimiento del pool">
    <div className="flex items-center justify-between gap-2">
      <p className="min-w-0 break-words font-display text-4xl font-bold text-primary">{apr == null ? "—" : `${apr.toLocaleString("es-MX", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`}</p>
      <Button size="icon" variant="ghost" aria-label="Actualizar rendimiento" title="Actualizar rendimiento" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={14} className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button>
    </div>
    <p className="mt-1 text-sm text-muted-foreground">APR estimado · comisiones 24 h</p>
    <p role="status" className="mt-2 text-xs leading-5 text-muted-foreground">{query.isPending ? "Consultando Meteora…" : query.isError ? "No se pudo actualizar la tasa. Inténtalo de nuevo." : apr == null ? "Tasa no disponible; no se muestran cifras ilustrativas." : `Fuente: Meteora · actualizado ${new Date(query.dataUpdatedAt).toLocaleTimeString("es-MX")}`}</p>
    <dl className="mt-3 space-y-2 text-xs">
      <div className="flex flex-wrap justify-between gap-1"><dt className="text-muted-foreground">Comisiones del pool · 24 h</dt><dd>{money(query.data?.fees24h)}</dd></div>
      <div className="flex flex-wrap justify-between gap-1"><dt className="text-muted-foreground">TVL · Meteora</dt><dd>{money(query.data?.tvl)}</dd></div>
    </dl>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">Comisiones reportadas de 24 h ÷ TVL actual × 365. Sin reinversión: no es APY ni rendimiento personal garantizado. No descuenta todos los costes ni pérdida impermanente.</p>
  </div>;
}