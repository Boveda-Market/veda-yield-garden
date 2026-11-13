import { Info, Sprout, Vault as VaultIcon, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import { formatUsd } from "@/lib/position-value";
import type { ChainPosition } from "@/lib/solana-data";
import { usePositionRows } from "@/hooks/use-position-rows";
import { useMeteoraHistory } from "@/hooks/use-meteora-history";
import { Button } from "./ui/button";
import { MASK, useHideBalances } from "@/lib/preferences";

/** Top-of-portfolio summary: capital working, pending (not harvested) and already harvested earnings. */
export function PortfolioSummary({ wallet, positions, positionsComplete, predictionsMicro, onHarvest }: { wallet: string | null; positions: ChainPosition[]; positionsComplete: boolean; predictionsMicro: bigint | null; onHarvest: (p: ChainPosition) => void }) {
  const t = useT();
  const [hidden] = useHideBalances();
  const { capital, totalFees, top, ready, loading } = usePositionRows(positions);
  const history = useMeteoraHistory(wallet);
  const pending = loading ? t("Calculando…") : t("No disponible");
  const capitalUsd = positionsComplete && capital !== null && predictionsMicro !== null ? capital + Number(predictionsMicro) / 1_000_000 : null;
  const percent = history.ready ? history.metrics.usdcHarvestPercent : null;
  const tile = "rounded-2xl border border-border bg-card p-4";
  const label = "flex items-center gap-1.5 text-xs text-muted-foreground";
  return <section aria-label={t("Resumen del portafolio")} className="mt-6 grid gap-3 sm:grid-cols-3">
    <div className={tile}>
      <p className={label}><VaultIcon size={14} />{t("Capital trabajando")}<span title={t("Valor estimado de tus bóvedas y predicciones abiertas al precio actual.")} className="cursor-help"><Info size={12} /></span></p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{capitalUsd === null ? (wallet ? pending : t("Conecta tu wallet")) : hidden ? MASK : `≈ ${formatUsd(capitalUsd)}`}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("{n} bóvedas activas", { n: String(positions.length) })}</p>
    </div>
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
      <p className={label}><Sprout size={14} className="text-primary" />{t("Por cosechar")}<span title={t("Comisiones generadas que aún no has enviado a tu wallet. El monto exacto se confirma al cosechar.")} className="cursor-help"><Info size={12} /></span></p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-primary">{loading && !top ? pending : hidden ? MASK : `≈ ${formatUsd(totalFees)}`}</p>
      {top ? <Button size="sm" className="mt-2 w-full" onClick={() => onHarvest(top.p)}><Sprout size={14} />{t("Cosechar ahora")}</Button> : <p className="mt-1 text-xs text-muted-foreground">{t("Sin ganancias pendientes por ahora.")}</p>}
      {ready.length > 1 && <p className="mt-1 text-xs text-muted-foreground">{t("Empieza por la bóveda con más ganancias.")}</p>}
    </div>
    <div className={tile}>
      <p className={label}><Sparkles size={14} />{t("Ganancias cobradas")}<span title={t("Suma de tus comisiones cosechadas al precio actual. No incluye cambios de precio de tu capital.")} className="cursor-help"><Info size={12} /></span></p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-primary">{history.pnl ? (hidden ? MASK : `+$${history.pnl}`) : history.query.isFetching ? t("Calculando…") : t("No disponible")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{percent !== null ? t("{percent}% sobre lo depositado", { percent }) : t("Se calcula con tus movimientos confirmados.")}</p>
    </div>
  </section>;
}
