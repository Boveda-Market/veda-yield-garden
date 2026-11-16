import { useQueries } from "@tanstack/react-query";
import { isDlmmVault, isOperableVault } from "@/lib/solana-data";
import { notify } from "@/lib/notify";
import { Link } from "@tanstack/react-router";
import { ArrowDownToLine, Plus, Repeat, Copy, ExternalLink, Sprout, Vault as VaultIcon } from "lucide-react";
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
import type { Vault } from "@/lib/vaults";
import { MigrateOffer } from "./migrate-banner";
import { RebalanceButton } from "./rebalance-button";
import { MigratePicker } from "./migrate-picker";
import { canHarvest } from "@/lib/harvest";
import { HotBanner } from "./hot-vault-card";
import { HotZoneMeter } from "./hot-zone-meter";

export function RealPositions({ positions, onAction, onDeposit, onMigrate, onRotate, showHarvestBanner = true, bare = false }: { bare?: boolean; positions: ChainPosition[]; onAction: (p: ChainPosition, a: "harvest" | "exit" | "compound") => void; onDeposit?: (p: ChainPosition) => void; onMigrate?: (p: ChainPosition, target: Vault) => void; onRotate?: (p: ChainPosition, target: Vault) => void; showHarvestBanner?: boolean }) {
  const t = useT();
  const { rows, totalFees, top } = usePositionRows(positions);
  const vaultYields = useQueries({ queries: VAULTS.map((v) => poolYieldOptions(v.pool)) });
  const aprs = Object.fromEntries(VAULTS.map((v, i) => [v.id, vaultYields[i]?.data?.apr ?? null]));
  const since = useMemo(() => Date.now(), [positions]);
  const copy = (address: string) => { void navigator.clipboard?.writeText(address).then(() => notify("success", t("Identificador copiado"))); };
  return <section aria-label={t("Posiciones reales")} className={bare ? "" : "border-b border-border py-8"}>
    {showHarvestBanner && top && totalFees >= 0.5 && <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/10 p-5"><div><p className="text-sm text-muted-foreground">{t("Ganancias listas para cosechar")}</p><p className="mt-1 font-display text-2xl font-semibold text-primary">≈ {formatUsd(totalFees)}</p><p className="mt-1 text-xs text-muted-foreground">{t("Envíalas a tu wallet sin tocar tu depósito.")}</p></div><Button onClick={() => onAction(top.p, "harvest")}><Sprout size={16} />{t("Cosechar ahora")}</Button></div>}
    {!bare && <h2 className="font-display text-lg font-semibold">{t("Mis posiciones")}</h2>}
    <div className={bare ? "grid gap-4" : "mt-4 grid gap-4 md:grid-cols-2"}>{rows.map(({ p, value, fees, apr }) => {
      const vault = VAULTS.find((v) => v.id === p.vaultId);
      const hot = Boolean(vault?.badge);
      const body = <>
        {hot && vault ? <HotBanner vault={vault} className="-mx-5 -mt-5 mb-2"><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${p.outOfRange ? "animate-pulse bg-destructive text-destructive-foreground motion-reduce:animate-none" : "bg-hot-surface"}`}>{p.locked ? t("Con liquidez bloqueada") : p.outOfRange ? `⚠️ ${t("Fuera de rango")}` : `🎯 ${t("En la zona caliente")}`}</span><span className="rounded-full bg-hot-surface/70 px-2 py-0.5 text-[10px] font-bold uppercase">🎰 {t("Sé la casa")}</span></HotBanner> : null}
        <div className="flex items-start justify-between gap-3"><div>{!hot && <h3 className="font-display font-semibold">{vault ? t(vault.name) : `${p.symbol}/USDC`}</h3>}<p className="mt-1 text-xs text-muted-foreground">{p.symbol}/USDC{hot ? "" : ` · ${p.locked ? t("Con liquidez bloqueada") : p.outOfRange ? t("Fuera de rango") : t("Activa")}`}</p><PoweredBy brand="meteora" className="mt-1 !justify-start" /></div></div>
        <p className="mt-1 text-xs text-muted-foreground">{t("Valor estimado")}</p>
        <p className={`font-display text-3xl font-semibold ${hot ? "w-fit bg-[image:var(--gradient-hot)] bg-clip-text font-black text-transparent" : ""}`}>{value === null ? t("No disponible") : `≈ ${formatUsd(value)}`}</p>
        {hot && <HotZoneMeter position={p} className="mt-3" />}
        {apr !== null && !p.locked && <p className="mt-2 text-xs tabular-nums text-muted-foreground"><span className="font-semibold text-primary">{apr.toFixed(2)}% APR</span> {t("estimado (24h)")} · {value === null ? "—" : `≈ +$${(value * apr / 36500).toFixed(2)}`} {t("próximas 24h")}</p>}
        {fees !== null && <LiveEarnings base={fees} ratePerMs={p.locked || p.outOfRange ? 0 : earningRatePerMs(value, apr)} since={since} label={t("Ganancias por cosechar · estimado en vivo")} />}
        {p.locked && <p className="mt-2 text-xs text-muted-foreground">{t("Incluye liquidez bloqueada; no toda la posición es retirable.")}</p>}
        {onMigrate && <MigrateOffer position={p} aprs={aprs} onMigrate={onMigrate} className="mt-3" />}
        <Button variant="outline" className="mt-3 h-14 w-full rounded-xl border-2 border-primary bg-primary/15 text-base font-extrabold text-primary shadow-md hover:bg-primary/25 disabled:border-border disabled:bg-muted disabled:text-muted-foreground" disabled={!canHarvest(fees)} onClick={() => onAction(p, "compound")}><Repeat size={18} strokeWidth={2.5} />{t("Sumar ganancias a la bóveda")}</Button><Button className="mt-2 w-full" disabled={!canHarvest(fees)} onClick={() => onAction(p, "harvest")}><Sprout size={16} />{t("Cosechar Ganancias")}</Button>
        <div className="mt-2 grid grid-cols-2 gap-2"><RebalanceButton position={p} className="col-span-2" />{onDeposit && isOperableVault(p.vaultId) && <Button size="sm" className="font-bold shadow-md" onClick={() => onDeposit(p)}><Plus size={16} strokeWidth={3} />{t("Depositar más")}</Button>}{onMigrate && isOperableVault(p.vaultId) && !p.locked && <MigratePicker position={p} aprs={aprs} onPick={onMigrate} />}<Button size="sm" variant="outline" onClick={() => onAction(p, "exit")}><ArrowDownToLine size={14} />{t("Retirar")}</Button></div>
        {/* Long explanations stay available but folded, so the card fits one phone screen. */}
        <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer text-center underline-offset-2 hover:underline">{t("Ver detalles")}</summary><div className="mt-2 space-y-1">
          {p.tokenAmount !== null && <p className="break-all">{`${p.tokenAmount} ${p.symbol} + ${p.usdcAmount} USDC`}</p>}
          {!canHarvest(fees) && <p>{t("Cosechar y reinvertir se activan desde $0.50 de ganancias.")}</p>}
          {p.outOfRange && <p role="status" className="mt-2 leading-5">{t("El precio salió del rango de esta bóveda: tu dinero sigue seguro pero no genera ganancias hasta que el precio vuelva o la cierres.")}</p>}
          <details className="mt-2"><summary className="cursor-pointer underline-offset-2 hover:underline">ⓘ {t("¿Por qué cambia este balance?")}</summary><p className="mt-1 leading-5">{t("Tu posición combina dólares y otra moneda. Cuando esa moneda baja, tu posición tiene más de ella y el valor en dólares puede verse menor que lo depositado. Cuando sube con fuerza, se rebalancea hacia dólares y tendrías menos monedas que si las hubieras guardado aparte. Esto se llama pérdida impermanente. Las comisiones que cosechas son aparte y ayudan a compensarla.")}</p></details>
          <div className="flex justify-center gap-1"><Button size="icon" variant="ghost" aria-label={t("Copiar identificador")} title={t("Copiar identificador")} onClick={() => copy(p.address)}><Copy size={14} /></Button><Button asChild size="icon" variant="ghost"><a href={`https://orbmarkets.io/address/${p.address}`} target="_blank" rel="noopener noreferrer" aria-label={t("Ver en el explorador")} title={t("Ver en el explorador")}><ExternalLink size={14} /></a></Button></div>
        </div></details>
        {!isOperableVault(p.vaultId) && <p className="mt-3 text-xs text-muted-foreground">{t("Cosechas y retiros todavía no disponibles para esta posición.")}</p>}
      </>;
      // High-octane vaults get the animated neon frame and sunset banner; actions stay identical to every other vault.
      return hot ? <article key={p.address} className="hot-ring rounded-2xl p-[2px] shadow-[var(--shadow-hot)]"><div className="h-full overflow-hidden rounded-[calc(1rem-2px)] bg-card p-5">{body}</div></article> : <article key={p.address} className="rounded-lg border border-border bg-card p-5">{body}</article>;
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
    <Button asChild className="mt-6"><Link to="/wallet">{t("Depositar en bóveda")}</Link></Button>
  </section>;
}
