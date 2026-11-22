import { SyncBar } from "@/components/ui/sync-bar";
import { useEffect, useRef } from "react";
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
import { MigratePicker } from "./migrate-picker";
import { canHarvest } from "@/lib/harvest";
import { HotBanner } from "./hot-vault-card";
import { HotZoneMeter } from "./hot-zone-meter";
import { vaultSkin } from "./vault-skin";

import { useAutopilot } from "@/components/autopilot-toggle";
import { showManualCompound } from "@/lib/autopilot";
export function RealPositions({ positions, onAction, onDeposit, onMigrate, onRotate, showHarvestBanner = true, bare = false }: { bare?: boolean; positions: ChainPosition[]; onAction: (p: ChainPosition, a: "harvest" | "exit" | "compound") => void; onDeposit?: (p: ChainPosition) => void; onMigrate?: (p: ChainPosition, target: Vault) => void; onRotate?: (p: ChainPosition, target: Vault) => void; showHarvestBanner?: boolean }) {
  useEffect(() => {
    const m = /^#vault-(.+)$/.exec(window.location.hash); if (!m) return;
    const sel = `[data-vault="${CSS.escape(m[1] ?? "")}"]`;
    // Router scroll restoration and late-loading cards above shift the page, so re-aim a few times.
    const timers = [120, 450, 900, 1600, 2500].map((ms) => window.setTimeout(() => { const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: ms === 120 ? "auto" : "smooth", block: "start" }); }, ms));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [positions.length]);
  const t = useT();
  const manualCompound = showManualCompound(useAutopilot().status?.failures);
  const { rows, totalFees, top } = usePositionRows(positions);
  const vaultYields = useQueries({ queries: VAULTS.map((v) => poolYieldOptions(v.pool)) });
  const aprs = Object.fromEntries(VAULTS.map((v, i) => [v.id, vaultYields[i]?.data?.apr ?? null]));
  const since = useMemo(() => Date.now(), [positions]);
  const copy = (address: string) => { void navigator.clipboard?.writeText(address).then(() => notify("success", t("Identificador copiado"))); };
  return <section aria-label={t("Posiciones reales")} className={bare ? "" : "border-b border-border py-8"}>
    {showHarvestBanner && top && totalFees >= 0.5 && <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/10 p-5"><div><p className="text-sm text-muted-foreground">{t("Ganancias listas para cosechar")}</p><p className="mt-1 font-display text-2xl font-semibold text-primary">≈ {formatUsd(totalFees)}</p><p className="mt-1 text-xs text-muted-foreground">{t("Envíalas a tu wallet sin tocar tu depósito.")}</p></div><Button onClick={() => onAction(top.p, "harvest")}><Sprout size={16} />{t("Cosechar ahora")}</Button></div>}
    {!bare && <h2 className="font-display text-lg font-semibold">{t("Mis posiciones")}</h2>}
    <div className={bare ? "grid gap-4" : `mt-4 grid gap-4 ${rows.length > 1 ? "md:grid-cols-2" : ""}`}>{[...rows].sort((a, b) => (b.value ?? -1) - (a.value ?? -1)).map(({ p, value, fees, apr }) => {
      const vault = VAULTS.find((v) => v.id === p.vaultId);
      const hot = Boolean(vault?.badge);
      const body = <>
        {hot && vault ? <HotBanner vault={vault} className="-mx-5 -mt-5 mb-2">{p.locked && !p.outOfRange && <span className="rounded-full bg-hot-surface px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">{t("Con liquidez bloqueada")}</span>}</HotBanner> : null}
        <div className="flex items-start justify-between gap-3"><div>{!hot && <h3 className="font-display font-semibold">{vault ? t(vault.name) : `${p.symbol}/USDC`}</h3>}{!hot && !p.outOfRange && <p className="mt-1 text-xs text-muted-foreground">{p.locked ? t("Con liquidez bloqueada") : t("Activa")}</p>}<PoweredBy brand="meteora" className="mt-1 !justify-start" /></div></div>
        <p className="mt-1 text-xs text-muted-foreground">{t("Valor estimado")}</p>
        <p className={`font-display text-3xl font-semibold ${hot ? "w-fit bg-[image:var(--gradient-hot)] bg-clip-text font-black text-transparent" : ""}`}>{value === null ? t("No disponible") : `≈ ${formatUsd(value)}`}</p>
        {hot && <HotZoneMeter position={p} className="mt-3" />}
        {apr !== null && !p.locked && <p className="mt-2 text-xs tabular-nums text-muted-foreground"><span className="font-semibold text-primary">{apr.toFixed(2)}% APR</span> {t("estimado (24h)")} · {value === null ? "—" : `≈ +$${(value * apr / 36500).toFixed(2)}`} {t("próximas 24h")}</p>}
        {fees === null && <SyncBar className="mt-3" />}
        {fees !== null && <LiveEarnings base={fees} ratePerMs={p.locked || p.outOfRange ? 0 : earningRatePerMs(value, apr)} since={since} label={t("Ganancias por cosechar · estimado en vivo")} />}
        {p.locked && <p className="mt-2 text-xs text-muted-foreground">{t("Incluye liquidez bloqueada; no toda la posición es retirable.")}</p>}
        {onMigrate && <MigrateOffer position={p} aprs={aprs} onMigrate={onMigrate} className="mt-3" />}
        {manualCompound && <Button variant="outline" className="cta-attn mt-3 h-auto min-h-14 w-full whitespace-normal rounded-xl border-2 border-primary disabled:animate-none bg-primary/15 text-base font-extrabold text-primary shadow-md hover:bg-primary/25 disabled:border-border disabled:bg-muted disabled:text-muted-foreground" disabled={!canHarvest(fees)} onClick={() => onAction(p, "compound")}><span className="cta-wiggle"><Repeat size={18} strokeWidth={2.5} /></span>{t("Sumar ganancias a la bóveda")}</Button>}
        <div className="mt-2 grid grid-cols-2 gap-2">{onDeposit && isOperableVault(p.vaultId) && <Button className="h-12 w-full min-w-0 gap-1.5 whitespace-normal rounded-xl px-2 text-sm font-bold leading-tight shadow-md" onClick={() => onDeposit(p)}><Plus size={16} strokeWidth={3} />{t("Depositar más")}</Button>}<Button className={`h-12 w-full min-w-0 gap-1.5 whitespace-normal rounded-xl px-2 text-sm font-bold leading-tight shadow-md ${onDeposit && isOperableVault(p.vaultId) ? "" : "col-span-2"}`} disabled={!canHarvest(fees)} onClick={() => onAction(p, "harvest")}><Sprout size={16} />{t("Cosechar dólares")}</Button>{onMigrate && isOperableVault(p.vaultId) && !p.locked && <MigratePicker position={p} aprs={aprs} onPick={onMigrate} />}<Button variant="outline" className="col-span-2 h-12 w-full rounded-xl font-semibold" onClick={() => onAction(p, "exit")}><ArrowDownToLine size={16} />{t("Retirar")}</Button></div>
        {/* Long explanations stay available but folded, so the card fits one phone screen. */}
        <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer text-center underline-offset-2 hover:underline">{t("Ver detalles")}</summary><div className="mt-2 space-y-1">
          {!canHarvest(fees) && <p>{t("Cosechar y reinvertir se activan desde $0.50 de ganancias.")}</p>}
          <div className="flex justify-center gap-1"><Button size="icon" variant="ghost" aria-label={t("Copiar identificador")} title={t("Copiar identificador")} onClick={() => copy(p.address)}><Copy size={14} /></Button><Button asChild size="icon" variant="ghost"><a href={`https://solscan.io/account/${p.address}`} target="_blank" rel="noopener noreferrer" aria-label={t("Ver en el explorador")} title={t("Ver en el explorador")}><ExternalLink size={14} /></a></Button></div>
        </div></details>
        {!isOperableVault(p.vaultId) && <p className="mt-3 text-xs text-muted-foreground">{t("Cosechas y retiros todavía no disponibles para esta posición.")}</p>}
      </>;
      // High-octane vaults get the animated neon frame and sunset banner; actions stay identical to every other vault.
      return hot ? <article key={p.address} id={`pos-${p.address}`} data-vault={p.vaultId} className={`scroll-mt-24 transition-shadow hot-ring rounded-2xl p-[2px] shadow-[var(--shadow-hot)] ${vaultSkin(p.vaultId)}`}><div className="h-full overflow-hidden rounded-[calc(1rem-2px)] bg-card p-5">{body}</div></article> : <article key={p.address} id={`pos-${p.address}`} data-vault={p.vaultId} className="scroll-mt-24 transition-shadow rounded-lg border border-border bg-card p-5">{body}</article>;
    })}</div>
    <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("Valores en dólares estimados al precio actual; pueden cambiar antes de firmar.")} {t("El contador en vivo estima cómo crecen tus ganancias con los intereses recientes de la bóveda; el monto exacto se confirma al cosechar.")}</p>
  </section>;
}

export function PortfolioEmpty() {
  const t = useT();
  return <section className="my-8 flex flex-col items-center rounded-lg border border-border bg-card px-6 py-12 text-center">
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary"><VaultIcon size={30} /></span>
    <h2 className="mt-5 font-display text-2xl font-semibold">{t("Tu dinero puede empezar a generar intereses")}</h2>
    <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("Aún no tienes bóvedas abiertas. Elige una, deposita y mira aquí cómo crecen tus ganancias.")}</p>
    <Button asChild className="mt-6"><Link to="/wallet">{t("Depositar en bóveda")}</Link></Button>
  </section>;
}

/** Compact grid of open vaults (capital + earnings); «Ver más» scrolls to that vault's full card. Renders nothing when there are none. */
export function VaultMiniCards({ positions, onOpen }: { positions: ChainPosition[]; onOpen?: (address: string) => void }) {
  const t = useT();
  // Biggest vault first so the most money is always the first card.
  const rows = [...usePositionRows(positions).rows].sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  // Prices arrive one by one and re-sort the cards; scroll snap would keep following the card it was on
  // (ending up at the smallest vault), so every new order starts again from the first (biggest) card.
  const strip = useRef<HTMLDivElement>(null);
  const order = rows.map((r) => r.p.address).join(",");
  useEffect(() => { strip.current?.scrollTo({ left: 0 }); }, [order]);
  if (rows.length === 0) return null;
  const go = (address: string) => { const el = document.getElementById(`pos-${address}`); if (!el) return; el.scrollIntoView({ behavior: "smooth", block: "start" }); el.classList.add("ring-4", "ring-primary"); window.setTimeout(() => el.classList.remove("ring-4", "ring-primary"), 1400); };
  // Mobile: one compact swipeable row so the chart below stays in the first fold; wider screens keep the grid.
  return <div ref={strip} aria-label={t("Tus bóvedas abiertas")} className="-mx-5 mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">{rows.map(({ p, value, fees }) => {
    const vault = VAULTS.find((v) => v.id === p.vaultId);
    const hot = Boolean(vault?.badge);
    return <button key={p.address} type="button" onClick={() => (onOpen ? onOpen(p.address) : go(p.address))} className={`flex w-[44%] min-w-[9.5rem] shrink-0 snap-start flex-col rounded-xl border bg-card px-3 py-2 text-left transition hover:bg-secondary md:w-auto md:min-w-0 ${hot ? `border-hot/60 shadow-[var(--shadow-hot)] ${vaultSkin(p.vaultId)}` : "border-border"}`}>
      <span className="flex items-center justify-between gap-1.5"><span className="truncate text-sm font-bold">{vault ? t(vault.name).replace(/^Bóveda /, "").replace(/ Vault$/i, "") : `${p.symbol}/USDC`}</span><span className="flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live shadow-[0_0_6px_var(--live)] motion-reduce:animate-none" />Live</span></span>
      <span className="mt-1 flex items-baseline justify-between gap-1"><span className="whitespace-nowrap font-display text-base font-semibold tabular-nums">{value === null ? "—" : `≈ ${formatUsd(value)}`}</span><span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{t("Ver más")} {onOpen ? "→" : "↓"}</span></span>
      <span className="truncate text-[11px] font-semibold tabular-nums text-primary">{fees === null ? t("Consultando…") : `+${formatUsd(fees)} ${t("por cosechar")}`}</span>
    </button>;
  })}</div>;
}
