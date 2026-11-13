import { Info, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { ChainPosition } from "@/lib/solana-data";
import { useMeteoraHistory } from "@/hooks/use-meteora-history";
import { MASK, useHideBalances } from "@/lib/preferences";

/** Harvested-earnings card shown after open positions (capital and pending live in Mi Billetera / each position). */
export function PortfolioSummary({ wallet }: { wallet: string | null; positions: ChainPosition[]; positionsComplete: boolean; predictionsMicro: bigint | null; onHarvest: (p: ChainPosition) => void }) {
  const t = useT();
  const [hidden] = useHideBalances();
  const history = useMeteoraHistory(wallet);
  const percent = history.ready ? history.metrics.usdcHarvestPercent : null;
  const tile = "rounded-2xl border border-border bg-card p-4";
  const label = "flex items-center gap-1.5 text-xs text-muted-foreground";
  return <section aria-label={t("Ganancias cobradas")} className="py-8">
    <div className={tile}>
      <p className={label}><Sparkles size={14} />{t("Ganancias cobradas")}<span title={t("Suma de tus comisiones cosechadas al precio actual. No incluye cambios de precio de tu capital.")} className="cursor-help"><Info size={12} /></span></p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-primary">{history.pnl ? (hidden ? MASK : `+$${history.pnl}`) : history.query.isFetching ? t("Calculando…") : t("No disponible")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{percent !== null ? t("{percent}% sobre lo depositado", { percent }) : t("Se calcula con tus movimientos confirmados.")}</p>
    </div>
  </section>;
}
