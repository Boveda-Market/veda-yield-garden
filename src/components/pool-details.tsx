import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchPoolStats } from "@/lib/pool-stats";
import type { Vault } from "@/lib/vaults";
import { PoolYield } from "@/components/pool-yield";

const number = (value: number | null | undefined, digits = 2) => value == null ? "—" : value.toLocaleString("es-MX", { maximumFractionDigits: digits });
const usd = (value: number | null | undefined, digits = 2) => value == null ? "—" : `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;

export function PoolDetails({ vault, onClose }: { vault: Vault; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const query = useQuery({
    queryKey: ["dexscreener-pool-stats", vault.pool],
    queryFn: ({ signal }) => fetchPoolStats(vault.pool, signal),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });
  const stats = query.data;
  const url = `https://app.meteora.ag/dammv2/${vault.pool}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg bg-card">
        <DialogHeader className="pr-5 text-left">
          <DialogTitle className="font-display text-xl tracking-normal">{vault.name}</DialogTitle>
          <DialogDescription>{vault.pair} · Pool de liquidez</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <p className="text-xs text-muted-foreground">{query.isPending ? "Consultando estadísticas…" : stats ? `Actualizado ${new Date(query.dataUpdatedAt).toLocaleTimeString("es-MX")}` : "Estadísticas no disponibles"}</p>
          <Button variant="ghost" size="icon" aria-label="Actualizar estadísticas" title="Actualizar estadísticas" disabled={query.isFetching} onClick={() => void query.refetch()}>
            <RefreshCw className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
          </Button>
        </div>

        <PoolYield address={vault.pool} />
        <dl className="grid grid-cols-2 gap-x-5 gap-y-6 py-2">
          <Metric label={`Precio ${stats?.baseSymbol ?? vault.pair.split("/")[0]} · USD`} value={usd(stats?.price, 6)} />
          <Metric label="Volumen · 24 h · USD" value={usd(stats?.volume24h)} />
          <Metric label="Liquidez en el pool · USD" value={usd(stats?.liquidityUsd)} />
          <Metric label="Variación del precio · 24 h" value={stats?.change24h == null ? "—" : `${stats.change24h > 0 ? "+" : ""}${number(stats.change24h)}%`} />
          <Metric label={`${stats?.baseSymbol ?? vault.pair.split("/")[0]} en el pool`} value={number(stats?.baseLocked, 4)} />
          <Metric label={`${stats?.quoteSymbol ?? "USDC"} en el pool`} value={number(stats?.quoteLocked, 4)} />
          <Metric label="Operaciones · 24 h" value={number(stats?.transactions24h, 0)} />
          <Metric label="Riesgo de la bóveda" value={vault.risk} />
        </dl>

        <p className="text-xs leading-relaxed text-muted-foreground" role="status">
          {query.isError ? "No se pudo actualizar la información de DexScreener. Inténtalo de nuevo." : !query.isPending && !stats ? "Este pool no tiene datos disponibles en DexScreener. No se muestran cifras estimadas." : "Fuente: DexScreener. Precio, volumen y liquidez en USD. La liquidez representa los activos del pool, no una garantía de bloqueo ni de rendimiento."}
        </p>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs text-muted-foreground">Referencia del pool</p>
          <div className="flex min-w-0 items-center gap-2">
            <input aria-label="enlace del pool para copiar" readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-muted-foreground" />
            <Button variant="secondary" size="icon" aria-label={copied ? "Enlace copiado" : "Copiar enlace del pool"} title="Copiar enlace del pool" onClick={() => void copy()}>{copied ? <Check /> : <Copy />}</Button>
          </div>
          {copied && <p role="status" className="mt-2 text-xs text-primary">URL copiada</p>}
          {copyError && <p role="status" className="mt-2 text-xs text-muted-foreground">No se pudo copiar. Selecciona la URL para copiarla manualmente.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-display text-xl font-semibold">{value}</dd></div>;
}