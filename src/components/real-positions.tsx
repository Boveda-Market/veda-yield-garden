import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDownToLine, Plus, Repeat, Copy, ExternalLink, Sprout, Vault as VaultIcon } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { fetchPoolStats } from "@/lib/pool-stats";
import { VAULTS } from "@/lib/vaults";
import { estimateUsd, formatUsd } from "@/lib/position-value";
import type { ChainPosition } from "@/lib/solana-data";
import { Button } from "./ui/button";
import { useMemo } from "react";
import { poolYieldOptions } from "@/lib/pool-yield";
import { earningRatePerMs } from "@/lib/live-earnings";
import { LiveEarnings } from "./live-earnings";
import { PoweredBy } from "./powered-by";

export function RealPositions({ positions, onAction, onDeposit }: { positions: ChainPosition[]; onAction: (p: ChainPosition, a: "harvest" | "exit" | "compound") => void; onDeposit?: (p: ChainPosition) => void }) {
  const t = useT();
  const pools = positions.map((p) => VAULTS.find((v) => v.id === p.vaultId)?.pool ?? null);
  const stats = useQueries({ queries: pools.map((pool) => ({ queryKey: ["dexscreener-pool-stats", pool], queryFn: ({ signal }: { signal: AbortSignal }) => fetchPoolStats(pool as string, signal), enabled: Boolean(pool), staleTime: 60_000, retry: 1 })) });
  const yields = useQueries({ queries: pools.map((pool) => ({ ...poolYieldOptions(pool ?? ""), enabled: Boolean(pool) })) });
  const since = useMemo(() => Date.now(), [positions]);
  const rows = positions.map((p, i) => {
    const s = stats[i]?.data;
    const price = s && s.baseSymbol.toUpperCase().includes(p.symbol.toUpperCase()) ? s.price : null;
    return { p, value: estimateUsd(p.tokenAmount, p.usdcAmount, price), fees: estimateUsd(p.feeTokenAmount, p.feeUsdcAmount, price), apr: yields[i]?.data?.apr ?? null };
  });
  const ready = rows.filter((r) => r.fees !== null && r.fees > 0 && (r.p.vaultId === "sol" || r.p.vaultId === "met"));
  const totalFees = ready.reduce((sum, r) => sum + (r.fees ?? 0), 0);
  const top = [...ready].sort((a, b) => (b.fees ?? 0) - (a.fees ?? 0))[0];
  const copy = (address: string) => { void navigator.clipboard?.writeText(address).then(() => toast.success(t("Identificador copiado"))); };
  return <section aria-label={t("Posiciones reales")} className="border-b border-border py-8">
    {top && <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/10 p-5"><div><p className="text-sm text-muted-foreground">{t("Ganancias listas para cosechar")}</p><p className="mt-1 font-display text-2xl font-semibold text-primary">≈ {formatUsd(totalFees)}</p><p className="mt-1 text-xs text-muted-foreground">{t("Envíalas a tu wallet sin tocar tu depósito.")}</p></div><Button onClick={() => onAction(top.p, "harvest")}><Sprout size={16} />{t("Cosechar ahora")}</Button></div>}
    <h2 className="font-display text-lg font-semibold">{t("Mis posiciones")}</h2>
    <div className="mt-4 grid gap-4 md:grid-cols-2">{rows.map(({ p, value, fees, apr }) => {
      const vault = VAULTS.find((v) => v.id === p.vaultId);
      return <article key={p.address} className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-display font-semibold">{vault ? t(vault.name) : `${p.symbol}/USDC`}</h3><p className="mt-1 text-xs text-muted-foreground">{p.symbol}/USDC · {p.locked ? t("Con liquidez bloqueada") : t("Activa")}</p><PoweredBy brand="meteora" className="mt-1 !justify-start" /></div>
          <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={t("Copiar identificador")} title={t("Copiar identificador")} onClick={() => copy(p.address)}><Copy size={14} /></Button><Button asChild size="icon" variant="ghost"><a href={`https://orbmarkets.io/address/${p.address}`} target="_blank" rel="noopener noreferrer" aria-label={t("Ver en el explorador")} title={t("Ver en el explorador")}><ExternalLink size={14} /></a></Button></div></div>
        <p className="mt-4 text-xs text-muted-foreground">{t("Valor estimado")}</p>
        <p className="font-display text-3xl font-semibold">{value === null ? t("No disponible") : `≈ ${formatUsd(value)}`}</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">{p.tokenAmount === null ? "" : `${p.tokenAmount} ${p.symbol} + ${p.usdcAmount} USDC`}</p>
        {apr !== null && !p.locked && <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-border bg-muted/40 p-2"><p className="text-muted-foreground">{t("Tasa estimada (24h)")}</p><p className="mt-0.5 font-display text-base font-semibold tabular-nums text-primary">{apr.toFixed(2)}% APR</p><p className="tabular-nums text-muted-foreground">≈ +{(apr / 365).toFixed(3)}% / {t("día")}</p></div>
          <div className="rounded-md border border-border bg-muted/40 p-2"><p className="text-muted-foreground">{t("Estimado próximas 24h")}</p><p className="mt-0.5 font-display text-base font-semibold tabular-nums text-primary">{value === null ? "—" : `≈ +$${(value * apr / 36500).toFixed(2)}`}</p><p className="text-muted-foreground">{t("con el ritmo reciente")}</p></div>
        </div>}
        {fees !== null && <LiveEarnings base={fees} ratePerMs={p.locked ? 0 : earningRatePerMs(value, apr)} since={since} label={t("Ganancias por cosechar · estimado en vivo")} />}
        {p.locked && <p className="mt-2 text-xs text-muted-foreground">{t("Incluye liquidez bloqueada; no toda la posición es retirable.")}</p>}
        <div className="mt-4 flex flex-wrap gap-2">{onDeposit && (p.vaultId === "sol" || p.vaultId === "met") && <Button onClick={() => onDeposit(p)}><Plus size={16} />{t("Depositar más")}</Button>}<Button variant="secondary" onClick={() => onAction(p, "harvest")}><Sprout size={16} />{t("Cosechar Ganancias")}</Button><Button variant="secondary" onClick={() => onAction(p, "compound")}><Repeat size={16} />{t("Reinvertir ganancias")}</Button><Button variant="outline" onClick={() => onAction(p, "exit")}><ArrowDownToLine size={16} />{t("Cerrar y Liquidar")}</Button></div>
        {p.vaultId !== "sol" && p.vaultId !== "met" && <p className="mt-3 text-xs text-muted-foreground">{t("Cosechas y retiros todavía no disponibles para esta posición.")}</p>}
      </article>;
    })}</div>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("Valores en dólares estimados al precio actual; pueden cambiar antes de firmar.")} {t("El contador en vivo estima cómo crecen tus ganancias con el rendimiento reciente de la bóveda; el monto exacto se confirma al cosechar.")}</p>
  </section>;
}

export function PortfolioEmpty() {
  const t = useT();
  return <section className="my-8 flex flex-col items-center rounded-lg border border-border bg-card px-6 py-12 text-center">
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary"><VaultIcon size={30} /></span>
    <h2 className="mt-5 font-display text-2xl font-semibold">{t("Tu dinero puede empezar a generar rendimientos")}</h2>
    <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("Aún no tienes bóvedas abiertas. Elige una, deposita USDC y mira aquí cómo crecen tus ganancias.")}</p>
    <Button asChild className="mt-6"><Link to="/app">{t("Hacer mi primer depósito")}</Link></Button>
  </section>;
}
