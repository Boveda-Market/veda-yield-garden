import { ArrowDownLeft, ArrowUpRight, Layers, PieChart, Sparkles, Sprout, TrendingUp } from "lucide-react";
import { useT } from "@/lib/i18n";
import { tokenAmount, type ChainPosition } from "@/lib/solana-data";
import { useMeteoraHistory } from "@/hooks/use-meteora-history";
import { usePositionRows } from "@/hooks/use-position-rows";
import { MASK, useHideBalances } from "@/lib/preferences";
import { formatUsd } from "@/lib/position-value";
import { canHarvest } from "@/lib/harvest";
import { VAULTS } from "@/lib/vaults";
import { Button } from "./ui/button";

const COLORS = ["bg-primary", "bg-chart-1", "bg-chart-2", "bg-chart-4", "bg-chart-3", "bg-chart-5"];

/** Visual performance board: capital split by vault/plays, weighted APR, pending, harvested PNL and in/out volume. */
export function PortfolioSummary({ wallet, positions, predictionsMicro, onHarvest }: { wallet: string | null; positions: ChainPosition[]; positionsComplete: boolean; predictionsMicro: bigint | null; onHarvest: (p: ChainPosition) => void }) {
  const t = useT();
  const [hidden] = useHideBalances();
  const money = (n: number | null) => n === null ? "—" : hidden ? MASK : formatUsd(n);
  const history = useMeteoraHistory(wallet);
  const { rows, totalFees, top } = usePositionRows(positions);
  const plays = predictionsMicro === null ? 0 : Number(predictionsMicro) / 1e6;
  const byVault = VAULTS.map((v) => {
    const mine = rows.filter((r) => r.p.vaultId === v.id);
    return { id: v.id, label: t(v.name), value: mine.reduce((s, r) => s + (r.value ?? 0), 0), apr: mine[0]?.apr ?? null };
  }).filter((x) => x.value > 0);
  const slices = [...byVault, ...(plays > 0 ? [{ id: "plays", label: t("Doble o Nada"), value: plays, apr: null }] : [])].sort((a, b) => b.value - a.value);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const vaultTotal = byVault.reduce((s, x) => s + x.value, 0);
  const aprWeighted = vaultTotal > 0 && byVault.every((x) => x.apr !== null) ? byVault.reduce((s, x) => s + x.value * (x.apr ?? 0), 0) / vaultTotal : null;
  const pnl = history.pnl ? Number(history.pnl.replace(/,/g, "")) : null;
  const pct = history.ready ? history.metrics.usdcHarvestPercent : null;
  const withdrawn = history.ready ? tokenAmount(history.metrics.totals.reduce((s, p) => s + p.withdrawUsdc, 0n).toString(), 6) : null;
  const tile = "rounded-2xl border border-border bg-card p-4";
  const label = "flex items-center gap-1.5 text-xs text-muted-foreground";
  const loading = history.query.isFetching ? t("Calculando…") : "—";

  return <section aria-label={t("Rendimiento de tu portafolio")} className="py-8">
    <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><TrendingUp size={18} className="text-primary" />{t("Tu rendimiento")}</h2>

    <div className={`${tile} mt-4`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className={label}><PieChart size={14} />{t("Capital trabajando")}</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums">{total > 0 ? money(total) : "—"}</p></div>
        {aprWeighted !== null && <div className="text-right"><p className="text-xs text-muted-foreground">{t("APR promedio")}</p><p className="font-display text-2xl font-bold tabular-nums text-primary">{aprWeighted.toFixed(1)}%</p></div>}
      </div>
      {total > 0 ? <>
        <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={t("Distribución de tu capital")}>{slices.map((s, i) => <div key={s.id} className={`${COLORS[i % COLORS.length]} h-full`} style={{ width: `${(s.value / total) * 100}%` }} />)}</div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">{slices.map((s, i) => <li key={s.id} className="flex items-center justify-between gap-2 text-sm"><span className="flex min-w-0 items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLORS[i % COLORS.length]}`} /><span className="truncate">{s.label}</span></span><span className="shrink-0 tabular-nums"><strong>{((s.value / total) * 100).toFixed(0)}%</strong> <span className="text-muted-foreground">· {money(s.value)}</span>{s.apr !== null && <span className="ml-1 text-xs text-primary">{s.apr.toFixed(0)}% APR</span>}</span></li>)}</ul>
      </> : <p className="mt-3 text-sm text-muted-foreground">{t("Cuando tengas dinero en bóvedas o jugadas verás aquí cómo se reparte.")}</p>}
    </div>

    <div className="mt-3 grid grid-cols-2 gap-3">
      <div className={tile}>
        <p className={label}><Sprout size={14} />{t("Por cosechar")}</p>
        <p className="mt-2 font-display text-xl font-semibold tabular-nums text-primary">{totalFees > 0 ? `+${money(totalFees)}` : money(0)}</p>
        {top && canHarvest(top.fees) ? <Button size="sm" className="mt-2 w-full" onClick={() => onHarvest(top.p)}>{t("Cosechar ahora")}</Button> : <p className="mt-1 text-xs text-muted-foreground">{t("Se activa desde $0.50.")}</p>}
      </div>
      <div className={tile}>
        <p className={label}><Sparkles size={14} />{t("Ganancias (PNL)")}</p>
        <p className="mt-2 font-display text-xl font-semibold tabular-nums text-primary">{pnl !== null ? `+${money(pnl)}` : loading}</p>
        <p className="mt-1 text-xs text-muted-foreground">{pct !== null ? t("{percent}% sobre lo depositado", { percent: String(pct) }) : t("Lo que ya cosechaste.")}</p>
        {pct !== null && <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} /></div>}
      </div>
      <div className={tile}>
        <p className={label}><ArrowDownLeft size={14} />{t("Total depositado")}</p>
        <p className="mt-2 font-display text-xl font-semibold tabular-nums">{history.ready ? (hidden ? MASK : `$${history.metrics.deposited}`) : loading}</p>
      </div>
      <div className={tile}>
        <p className={label}><ArrowUpRight size={14} />{t("Total retirado")}</p>
        <p className="mt-2 font-display text-xl font-semibold tabular-nums">{withdrawn !== null ? (hidden ? MASK : `$${withdrawn}`) : loading}</p>
      </div>
    </div>
    <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground"><Layers size={12} className="mt-0.5 shrink-0" />{t("Ganancias = lo que ya cosechaste, al precio de hoy. No incluye subidas o bajadas del precio de tu capital.")}</p>
  </section>;
}
