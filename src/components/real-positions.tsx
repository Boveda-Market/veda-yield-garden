import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDownToLine, Plus, Repeat, Copy, ExternalLink, Sprout, Vault as VaultIcon } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { VAULTS } from "@/lib/vaults";
import { formatUsd } from "@/lib/position-value";
import { usePositionRows } from "@/hooks/use-position-rows";
import type { ChainPosition } from "@/lib/solana-data";
import { Button } from "./ui/button";
import { useMemo } from "react";
import { poolYieldOptions } from "@/lib/pool-yield";
import { earningRatePerMs } from "@/lib/live-earnings";
import { LiveEarnings } from "./live-earnings";
import { PoweredBy } from "./powered-by";
import { bestUpgrade } from "@/lib/migrate";
import type { Vault } from "@/lib/vaults";
import { Zap } from "lucide-react";

export function RealPositions({ positions, onAction, onDeposit, onMigrate, showHarvestBanner = true }: { positions: ChainPosition[]; onAction: (p: ChainPosition, a: "harvest" | "exit" | "compound") => void; onDeposit?: (p: ChainPosition) => void; onMigrate?: (p: ChainPosition, target: Vault) => void; showHarvestBanner?: boolean }) {
  const t = useT();
  const { rows, totalFees, top } = usePositionRows(positions);
  const vaultYields = useQueries({ queries: VAULTS.map((v) => poolYieldOptions(v.pool)) });
  const aprs = Object.fromEntries(VAULTS.map((v, i) => [v.id, vaultYields[i]?.data?.apr ?? null]));
  const since = useMemo(() => Date.now(), [positions]);
  const copy = (address: string) => { void navigator.clipboard?.writeText(address).then(() => toast.success(t("Identificador copiado"))); };
  return <section aria-label={t("Posiciones reales")} className="border-b border-border py-8">
    {showHarvestBanner && top && <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/10 p-5"><div><p className="text-sm text-muted-foreground">{t("Ganancias listas para cosechar")}</p><p className="mt-1 font-display text-2xl font-semibold text-primary">≈ {formatUsd(totalFees)}</p><p className="mt-1 text-xs text-muted-foreground">{t("Envíalas a tu wallet sin tocar tu depósito.")}</p></div><Button onClick={() => onAction(top.p, "harvest")}><Sprout size={16} />{t("Cosechar ahora")}</Button></div>}
    <h2 className="font-display text-lg font-semibold">{t("Mis posiciones")}</h2>
    <div className="mt-4 grid gap-4 md:grid-cols-2">{rows.map(({ p, value, fees, apr }) => {
      const vault = VAULTS.find((v) => v.id === p.vaultId);
      return <article key={p.address} className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-display font-semibold">{vault ? t(vault.name) : `${p.symbol}/USDC`}</h3><p className="mt-1 text-xs text-muted-foreground">{p.symbol}/USDC · {p.locked ? t("Con liquidez bloqueada") : t("Activa")}</p><PoweredBy brand="meteora" className="mt-1 !justify-start" /></div>
          <div className="flex gap-1"><Button size="icon" variant="ghost" aria-label={t("Copiar identificador")} title={t("Copiar identificador")} onClick={() => copy(p.address)}><Copy size={14} /></Button><Button asChild size="icon" variant="ghost"><a href={`https://orbmarkets.io/address/${p.address}`} target="_blank" rel="noopener noreferrer" aria-label={t("Ver en el explorador")} title={t("Ver en el explorador")}><ExternalLink size={14} /></a></Button></div></div>
        <p className="mt-4 text-xs text-muted-foreground">{t("Valor estimado")}</p>
        <p className="font-display text-3xl font-semibold">{value === null ? t("No disponible") : `≈ ${formatUsd(value)}`}</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">{p.tokenAmount === null ? "" : `${p.tokenAmount} ${p.symbol} + ${p.usdcAmount} USDC`}</p>
        {apr !== null && !p.locked && <p className="mt-3 text-xs tabular-nums text-muted-foreground"><span className="font-semibold text-primary">{apr.toFixed(2)}% APR</span> {t("estimado (24h)")} · {value === null ? "—" : `≈ +$${(value * apr / 36500).toFixed(2)}`} {t("próximas 24h")}</p>}
        {fees !== null && <LiveEarnings base={fees} ratePerMs={p.locked ? 0 : earningRatePerMs(value, apr)} since={since} label={t("Ganancias por cosechar · estimado en vivo")} />}
        {p.locked && <p className="mt-2 text-xs text-muted-foreground">{t("Incluye liquidez bloqueada; no toda la posición es retirable.")}</p>}
        {(() => { const up = onMigrate && !p.locked && (p.vaultId === "sol" || p.vaultId === "met") ? bestUpgrade(p.vaultId, aprs) : null; const target = up ? VAULTS.find((v) => v.id === up.id) : null; if (!up || !target) return null; return <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2"><p className="text-xs" title={t("Mueve todo (depósito y ganancias) sin comisión de BÓVEDA al salir ni al depositar. Ganas el mayor APR desde el primer día.")}><Zap size={12} className="mr-1 inline text-primary" />{t("{v} rinde +{g}% APR más ahora", { v: t(target.name), g: up.gain.toFixed(1) })}</p><Button size="sm" variant="ghost" onClick={() => onMigrate?.(p, target)}>{t("Mover a mayor APR")}</Button></div>; })()}
        <Button className="mt-4 w-full" onClick={() => onAction(p, "harvest")}><Sprout size={16} />{t("Cosechar Ganancias")}</Button>
        <div className="mt-2 grid grid-cols-2 gap-2">{onDeposit && (p.vaultId === "sol" || p.vaultId === "met") && <Button size="sm" variant="secondary" onClick={() => onDeposit(p)}><Plus size={14} />{t("Depositar más")}</Button>}<Button size="sm" variant="secondary" onClick={() => onAction(p, "compound")}><Repeat size={14} />{t("Cosechar y reinvertir todo")}</Button><Button size="sm" variant="outline" className="col-span-2" onClick={() => onAction(p, "exit")}><ArrowDownToLine size={14} />{t("Retirar o liquidar")}</Button></div>
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
