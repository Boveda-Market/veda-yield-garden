import { useT } from "@/lib/i18n";
import { formatCoinPrice } from "@/lib/format-price";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { poolYieldOptions } from "@/lib/pool-yield";
import { bitcoinStatsOptions } from "@/lib/bitcoin-stats";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchPoolStats, coinLabel } from "@/lib/pool-stats";
import type { Vault } from "@/lib/vaults";
import { isDlmmVault } from "@/lib/solana-data";
import { MetricHelpGrid, type MetricTile } from "@/components/metric-help";
import { MarketPerformance } from "@/components/market-performance";
import { vaultSkin } from "@/components/vault-skin";

const number = (value: number | null | undefined, digits = 2) => value == null ? "—" : value.toLocaleString("es-MX", { maximumFractionDigits: digits });
/** Short amounts for narrow tiles: $1.1M, 987M (no «B»: in Spanish a billón is 10¹²). */
const compact = (v: number | null | undefined) => v == null ? "—" : v >= 1e6 ? `${(v / 1e6).toLocaleString("en-US", { maximumFractionDigits: v >= 1e8 ? 0 : 1 })}M` : Math.round(v).toLocaleString("en-US");
const usdShort = (v: number | null | undefined) => v == null ? "—" : `$${compact(v)}`;

export function PoolDetails({ vault, onClose }: { vault: Vault; onClose: () => void }) {
  const t = useT();
  const [tab, setTab] = useState<"perf" | "stats">("perf");
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
  const y = yieldQ.data;
  const sym = `$${coinLabel(stats?.baseSymbol ?? y?.symbolX, vault.pair.split("/")[0] ?? "")}`;
  const buys1h = stats?.buys1h ?? null, sells1h = stats?.sells1h ?? null;
  const trades1h = buys1h != null && sells1h != null ? buys1h + sells1h : null;
  const isBtc = vault.id === "btc";
  const btcQ = useQuery({ ...bitcoinStatsOptions(), enabled: isBtc });
  const btc = btcQ.data;
  // Big market caps keep the number short and put the unit in the sub-line so narrow tiles never truncate.
  const capParts = (v: number | null | undefined, fallbackSub: string) => v == null ? { value: "—", sub: fallbackSub }
    : v >= 1e12 ? { value: `$${(v / 1e12).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`, sub: t("Billones de dólares") }
    : v >= 1e9 ? { value: `$${(v / 1e9).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`, sub: t("Miles de millones de dólares") }
    : { value: usdShort(v), sub: fallbackSub };
  const btcCap = capParts(btc?.marketCap, t("Todo el bitcoin del mundo"));
  const coinCap = capParts(y?.tokenMarketCap ?? stats?.marketCap, t("Precio × monedas en circulación"));
  // Coin facts and right-now pool activity; whole-day figures (price, APR, TVL, volume, fees, trades) live in «Rendimiento y Mercado».
  // Bóveda Bitcoin: coin facts describe Bitcoin itself (network stats), issuer freeze powers are disclosed in Términos, not as tiles.
  const btcTiles: MetricTile[] = [
    { label: t("Personas con {s}", { s: sym }), value: compact(btc?.holders), sub: t("Direcciones con bitcoin"), help: "Cuántas direcciones de Bitcoin en el mundo tienen saldo hoy. Una persona puede tener varias, así que es una idea aproximada de cuánta gente tiene bitcoin.", accent: true },
    { label: t("Valor de mercado"), value: btcCap.value, sub: btcCap.sub, help: "El precio de Bitcoin multiplicado por todos los bitcoins que existen. Es la moneda digital más grande del mundo." },
    { label: t("Bitcoins en circulación"), value: compact(btc?.circulating), sub: t("De 21M que existirán"), help: "Cuántos bitcoins existen hoy. Nunca habrá más de 21 millones: esa escasez es parte de por qué se le llama oro digital." },
    { label: t("Respaldo en la bóveda"), value: "1:1", sub: t("Bitcoin de Coinbase"), help: "Esta bóveda usa el Bitcoin de Coinbase (cbBTC): cada moneda está respaldada por un bitcoin real que Coinbase guarda. Por eso su precio sigue al de Bitcoin." },
  ];
  const coinTiles: MetricTile[] = isBtc ? btcTiles : [
    { label: t("Personas con {s}", { s: sym }), value: number(y?.holders, 0), sub: t("Billeteras que la tienen"), help: "Cuántas billeteras tienen esta moneda hoy. Muchas personas significa una moneda más conocida, con más gente comprando y vendiendo.", accent: true },
    { label: t("Valor de mercado"), value: coinCap.value, sub: coinCap.sub, help: "El precio de la moneda multiplicado por todas las monedas que circulan. Sirve para comparar qué tan grande es una moneda frente a otras." },
    { label: t("Monedas emitidas"), value: compact(y?.tokenSupply), sub: t("Total que existe"), help: "Cuántas monedas existen en total. Si hay pocas, cada una suele valer más; si hay miles de millones, cada una puede valer centavos." },
    { label: t("Verificación pública"), value: y?.tokenVerified == null ? "—" : y.tokenVerified ? t("✓ Verificada") : t("Sin verificar"), sub: t("Listas públicas de monedas"), help: "Indica si esta moneda aparece verificada en listas públicas de monedas. Ayuda a evitar copias falsas con el mismo nombre, pero no garantiza que su precio suba." },
  ];
  const poolTiles: MetricTile[] = [
    { label: t("Volumen · última hora"), value: usdShort(stats?.volume1h ?? y?.volume1h), sub: t("Dinero intercambiado"), help: "Cuánto dinero se intercambió en la última hora. Te muestra si la bóveda está activa en este momento.", accent: true },
    { label: t("Intercambios · última hora"), value: number(trades1h, 0), sub: trades1h ? t("{p} compras", { p: `${Math.round((buys1h ?? 0) / trades1h * 100)}%` }) : t("Compras y ventas"), help: "Compras y ventas que hicieron otras personas en la última hora. Cada una paga una pequeña comisión que se reparte entre los depósitos." },
    { label: t("{s} en el pool", { s: sym }), value: number(stats?.baseLocked ?? y?.amountX, 4), sub: t("Cantidad de monedas"), help: "Cuántas monedas hay guardadas en el pool ahora mismo. Cambia todo el tiempo: cuando alguien compra, sale moneda y entran dólares digitales, y al revés." },
    { label: t("Dólares digitales en el pool"), value: number(stats?.quoteLocked ?? y?.amountY, 2), sub: t("Cantidad de monedas"), help: "Cuántos dólares digitales hay guardados en el pool ahora mismo. Suben cuando la gente vende la moneda y bajan cuando la compra." },
    { label: t("Para los depósitos"), value: y?.depositorFeeShare == null ? "—" : `${number(y.depositorFeeShare, 1)}%`, sub: t("De cada comisión"), help: "De cada comisión que pagan quienes cambian monedas, esta parte se reparte entre los depósitos como el tuyo. El resto es la tarifa de la plataforma del pool." },
    { label: t("Riesgo de la bóveda"), value: t(vault.risk), sub: vault.badge ? t(vault.badge) : undefined, help: "Nuestra clasificación sencilla de qué tanto puede subir o bajar el valor de tu depósito. Más riesgo suele venir con más intereses y más altibajos." },
  ];
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

        <div className="grid grid-cols-2 rounded-full bg-secondary p-1" role="tablist">{([["perf", t("Rendimiento y Mercado")], ["stats", t("Estadísticas del Pool")]] as const).map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-2 py-2 text-xs font-bold transition ${tab === k ? "bg-foreground text-background" : "text-muted-foreground"}`}>{l}</button>)}</div>
        {tab === "perf" ? <MarketPerformance vault={vault} /> : <>
        <section aria-label={t("La moneda {s}", { s: sym })} className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("La moneda {s}", { s: sym })}</p>
          <MetricHelpGrid tiles={coinTiles} />
        </section>
        <section aria-label={t("Cambio de precio")} className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Cambio de precio")}</p>
          <div className="grid grid-cols-3 gap-2">{([["5 min", stats?.change5m], ["1 h", stats?.change1h], ["6 h", stats?.change6h]] as const).map(([k, v]) => <div key={k} className={`rounded-lg p-2 text-center ${v == null ? "bg-muted" : v >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}><p className="text-[11px] text-muted-foreground">{k}</p><p className={`flex items-center justify-center gap-1 font-display font-bold tabular-nums ${v == null ? "" : v >= 0 ? "text-primary" : "text-destructive"}`}>{v == null ? "—" : <>{v >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{v > 0 ? "+" : ""}{number(v)}%</>}</p></div>)}</div>
        </section>
        <section aria-label={t("Ahora mismo en el pool")} className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Ahora mismo en el pool")}</p>
          <MetricHelpGrid tiles={poolTiles} />
        </section>
        {<p className="text-xs leading-relaxed text-foreground">{t(vault.blurb)}{vault.note && <span className="mt-1 block text-muted-foreground">{t(vault.note)}</span>}</p>}

        <p className="text-xs leading-relaxed text-muted-foreground" role="status">
          {query.isError ? t("No se pudo actualizar la información de DexScreener. Inténtalo de nuevo.") : !query.isPending && !stats ? t("Este pool no tiene datos disponibles en DexScreener. No se muestran cifras estimadas.") : t("Fuente: datos públicos del pool y DexScreener. Las cantidades de monedas no son dólares. Nada de esto garantiza ganancias.")}
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
        </>}
        <div className="sticky -bottom-6 -mx-6 -mb-6 border-t border-border bg-card px-6 py-3">
          <DialogClose asChild><Button size="lg" className="w-full font-semibold">{t("Cerrar detalles")}</Button></DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

