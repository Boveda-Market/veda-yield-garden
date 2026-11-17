import { useT } from "@/lib/i18n";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, RefreshCw, TrendingDown, TrendingUp, Users } from "lucide-react";
import { poolYieldOptions } from "@/lib/pool-yield";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchPoolStats } from "@/lib/pool-stats";
import type { Vault } from "@/lib/vaults";
import { isDlmmVault } from "@/lib/solana-data";
import { PoolYield } from "@/components/pool-yield";

const number = (value: number | null | undefined, digits = 2) => value == null ? "—" : value.toLocaleString("es-MX", { maximumFractionDigits: digits });
const usd = (value: number | null | undefined, digits = 2) => value == null ? "—" : `$${value.toLocaleString("es-MX", { minimumFractionDigits: Math.min(2, digits), maximumFractionDigits: digits })}`;

export function PoolDetails({ vault, onClose }: { vault: Vault; onClose: () => void }) {
  const t = useT();
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
  const yieldQ = useQuery(poolYieldOptions(vault.pool));
  const holders = yieldQ.data?.holders ?? null, fees24h = yieldQ.data?.fees24h ?? null;
  const buys = stats?.buys24h ?? null, sells = stats?.sells24h ?? null;
  const url = `https://app.meteora.ag/${isDlmmVault(vault.id) ? "dlmm" : "dammv2"}/${vault.pool}`;
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
          <DialogTitle className="font-display text-xl tracking-normal">{t(vault.name)}</DialogTitle>
          <DialogDescription>{vault.pair} {t("· Pool de liquidez")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <p className="text-xs text-muted-foreground">{query.isPending ? t("Consultando estadísticas…") : stats ? `Actualizado ${new Date(query.dataUpdatedAt).toLocaleTimeString("es-MX")}` : t("Estadísticas no disponibles")}</p>
          <Button variant="ghost" size="icon" aria-label={t("Actualizar estadísticas")} title={t("Actualizar estadísticas")} disabled={query.isFetching} onClick={() => void query.refetch()}>
            <RefreshCw className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
          </Button>
        </div>

        <PoolYield address={vault.pool} />
        {holders != null && <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3"><Users className="h-6 w-6 shrink-0 text-primary" /><div><p className="font-display text-lg font-bold tabular-nums">+{number(holders, 0)} {t("poseedores")}</p><p className="text-xs text-muted-foreground">{t("Comunidad activa con alto volumen de intercambio.")}</p></div></div>}
        {fees24h != null && <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">💰 {t("Intereses repartidas · 24 h")}</p><p className="font-display text-2xl font-bold tabular-nums text-primary">+{usd(fees24h)}</p></div>}
        {buys != null && sells != null && buys + sells > 0 && <div className="grid gap-1.5">
          <div className="flex justify-between text-xs font-semibold"><span className="text-primary">{t("Compras")} {Math.round(buys / (buys + sells) * 100)}% · {number(buys, 0)}</span><span className="text-destructive">{number(sells, 0)} · {Math.round(sells / (buys + sells) * 100)}% {t("Ventas")}</span></div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-label={t("Presión de mercado · 24 h")}><div className="bg-primary transition-all" style={{ width: `${buys / (buys + sells) * 100}%` }} /><div className="flex-1 bg-destructive" /></div>
          <p className="text-[11px] text-muted-foreground">{t("Presión de mercado · 24 h")}</p>
        </div>}
        <div className="grid grid-cols-3 gap-2">{([["1 h", stats?.change1h], ["6 h", stats?.change6h], ["24 h", stats?.change24h]] as const).map(([k, v]) => <div key={k} className={`rounded-lg p-2 text-center ${v == null ? "bg-muted" : v >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}><p className="text-[11px] text-muted-foreground">{k}</p><p className={`flex items-center justify-center gap-1 font-display font-bold tabular-nums ${v == null ? "" : v >= 0 ? "text-primary" : "text-destructive"}`}>{v == null ? "—" : <>{v >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{v > 0 ? "+" : ""}{number(v)}%</>}</p></div>)}</div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-6 py-2">
          <Metric label={`Precio ${stats?.baseSymbol ?? vault.pair.split("/")[0]} · USD`} value={usd(stats?.price, 6)} />
          <Metric label={t("Volumen · 24 h · USD")} value={usd(stats?.volume24h)} />
          <Metric label={t("Liquidez en el pool · USD")} value={usd(stats?.liquidityUsd)} />
          <Metric label={t("Valor de mercado · USD")} value={usd(stats?.marketCap, 0)} />
          <Metric label={`${stats?.baseSymbol ?? vault.pair.split("/")[0]} en el pool`} value={number(stats?.baseLocked, 4)} />
          <Metric label={`${stats?.quoteSymbol ?? "USDC"} en el pool`} value={number(stats?.quoteLocked, 4)} />
          <Metric label={t("Operaciones · 24 h")} value={number(stats?.transactions24h, 0)} />
          <Metric label={t("Riesgo de la bóveda")} value={vault.badge ? t(vault.badge) : t(vault.risk)} />
        </dl>
        {<p className="text-xs leading-relaxed text-foreground">{t(vault.blurb)}{vault.note && <span className="mt-1 block text-muted-foreground">{t(vault.note)}</span>}</p>}

        <p className="text-xs leading-relaxed text-muted-foreground" role="status">
          {query.isError ? t("No se pudo actualizar la información de DexScreener. Inténtalo de nuevo.") : !query.isPending && !stats ? t("Este pool no tiene datos disponibles en DexScreener. No se muestran cifras estimadas.") : t("Fuente: DexScreener. Precio, volumen y liquidez en USD. La liquidez representa los activos del pool, no una garantía de bloqueo ni de rendimiento.")}
        </p>

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-xs text-muted-foreground">{t("Referencia del pool")}</p>
          <div className="flex min-w-0 items-center gap-2">
            <input aria-label={t("enlace del pool para copiar")} readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-muted-foreground" />
            <Button variant="secondary" size="icon" aria-label={copied ? t("Enlace copiado") : t("Copiar enlace del pool")} title={t("Copiar enlace del pool")} onClick={() => void copy()}>{copied ? <Check /> : <Copy />}</Button>
          </div>
          {copied && <p role="status" className="mt-2 text-xs text-primary">{t("URL copiada")}</p>}
          {copyError && <p role="status" className="mt-2 text-xs text-muted-foreground">{t("No se pudo copiar. Selecciona la URL para copiarla manualmente.")}</p>}
        </div>
        <div className="sticky -bottom-6 -mx-6 -mb-6 border-t border-border bg-card px-6 py-3">
          <DialogClose asChild><Button size="lg" className="w-full font-semibold">{t("Cerrar detalles")}</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-display text-xl font-semibold">{value}</dd></div>;
}