import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownToLine, Plus, Repeat, Sprout } from "lucide-react";
import { useT } from "@/lib/i18n";
import { fetchPoolStats } from "@/lib/pool-stats";
import { poolYieldOptions } from "@/lib/pool-yield";
import { estimateUsd, formatUsd } from "@/lib/position-value";
import { earningRatePerMs } from "@/lib/live-earnings";
import { VAULTS } from "@/lib/vaults";
import { isOperableVault, type ChainPosition, type OperableVault } from "@/lib/solana-data";
import { Button } from "@/components/ui/button";
import { TokenIcon } from "@/components/token-icon";
import { LiveEarnings } from "@/components/live-earnings";
import { HarvestDialog } from "@/components/harvest-dialog";
import { WithdrawalSimulation } from "@/components/withdrawal-simulation";
import { DepositSimulation } from "@/components/deposit-simulation";
import { PoweredBy } from "@/components/powered-by";
import { RebalanceButton, RangeUrgentBanner } from "@/components/rebalance-button";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useRealWallet } from "@/hooks/use-real-wallet";
import { canHarvest } from "@/lib/harvest";

type Supported = OperableVault;
const supported = isOperableVault;

/** Shared cached read of the wallet's open vault positions (same cache as every wallet screen). */
export function useWalletVaults(wallet: string) {
  return useRealWallet(wallet);
}

/** Urgent out-of-range notice for Mi Billetera; a ?rebalance=<position> link (bell, Telegram) opens its sheet directly. */
export function WalletRangeBanner({ wallet }: { wallet: string }) {
  const query = useWalletVaults(wallet);
  const positions: ChainPosition[] = query.data?.success ? query.data.data.positions : [];
  const target = (useSearch({ strict: false }) as { rebalance?: string }).rebalance ?? null;
  const navigate = useNavigate();
  const [openFor, setOpenFor] = useState<string | null>(null);
  useEffect(() => {
    if (!target || !positions.some((p) => p.address === target)) return;
    setOpenFor(target);
    void navigate({ to: "/wallet", search: {}, replace: true });
  }, [target, positions, navigate]);
  return <RangeUrgentBanner positions={positions} openFor={openFor} />;
}

/** Compact open-vault cards for Mi Billetera; renders nothing without open positions. */
export function WalletPositions({ wallet }: { wallet: string }) {
  const t = useT();
  const query = useWalletVaults(wallet);
  const positions: ChainPosition[] = query.data?.success ? query.data.data.positions : [];
  const pools = positions.map((p) => VAULTS.find((v) => v.id === p.vaultId)?.pool ?? null);
  const stats = useQueries({ queries: pools.map((pool) => ({ queryKey: ["dexscreener-pool-stats", pool], queryFn: ({ signal }: { signal: AbortSignal }) => fetchPoolStats(pool as string, signal), enabled: Boolean(pool), staleTime: 60_000, retry: 1 })) });
  const yields = useQueries({ queries: pools.map((pool) => ({ ...poolYieldOptions(pool ?? ""), enabled: Boolean(pool) })) });
  const since = useMemo(() => Date.now(), [positions.length]);
  const [harvest, setHarvest] = useState<{ position: string; vaultId: Supported; compound?: boolean } | null>(null);
  const [exit, setExit] = useState<{ position: string; vaultId: Supported } | null>(null);
  const [addTo, setAddTo] = useState<{ position: string; vaultId: Supported } | null>(null);
  if (positions.length === 0) return null;
  const addVault = addTo ? VAULTS.find((v) => v.id === addTo.vaultId) : undefined;
  return <section aria-label={t("Tus posiciones abiertas")} className="rounded-2xl border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-2"><h3 className="font-display text-base font-semibold">{t("Tus posiciones abiertas")} · {positions.length}</h3><Link to="/portfolio" className="text-xs font-medium text-primary">{t("Ver en portafolio")}</Link></div>
    <ul className="mt-3 space-y-3">{positions.map((p, i) => {
      const s = stats[i]?.data;
      const price = s && s.baseSymbol.toUpperCase().includes(p.symbol.toUpperCase()) ? s.price : null;
      const value = estimateUsd(p.tokenAmount, p.usdcAmount, price);
      const fees = estimateUsd(p.feeTokenAmount, p.feeUsdcAmount, price);
      const apr = yields[i]?.data?.apr ?? null;
      const v = VAULTS.find((x) => x.id === p.vaultId);
      const ok = supported(p.vaultId);
      return <li key={p.address} className="rounded-xl border border-border bg-background/40 p-3">
        <div className="flex items-center gap-2"><TokenIcon symbol={p.symbol} size={28} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{v ? t(v.name) : `${p.symbol}/USDC`}</p><p className="text-xs text-muted-foreground">{p.symbol}/USDC{p.locked ? ` · ${t("Con liquidez bloqueada")}` : ""}{p.outOfRange ? ` · ${t("Fuera de rango")}` : ""}</p><PoweredBy brand="meteora" className="mt-0.5 !justify-start" /></div></div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg bg-muted/50 p-2"><dt className="text-muted-foreground">{t("Valor")}</dt><dd className="mt-0.5 font-display text-sm font-semibold tabular-nums">{value === null ? "—" : `≈ ${formatUsd(value)}`}</dd></div>
          <div className="rounded-lg bg-muted/50 p-2"><dt className="text-muted-foreground">{t("Rendimiento")}</dt><dd className="mt-0.5 font-display text-sm font-semibold tabular-nums text-primary">{apr === null ? "—" : `${apr.toFixed(1)}% APR`}</dd></div>
          <div className="rounded-lg bg-muted/50 p-2"><dt className="text-muted-foreground">{t("PNL")}</dt><dd className="mt-0.5 font-display text-sm font-semibold tabular-nums text-primary">{fees === null ? "—" : `+${formatUsd(fees)}`}</dd></div>
        </dl>
        {fees !== null && <LiveEarnings base={fees} ratePerMs={p.locked ? 0 : earningRatePerMs(value, apr)} since={since} label={t("Ganancias por cosechar · estimado en vivo")} />}
        {ok ? <><Button className="mt-3 w-full" disabled={!canHarvest(fees)} onClick={() => setHarvest({ position: p.address, vaultId: p.vaultId as Supported })}><Sprout size={16} />{t("Cosechar ganancias")}</Button>{!canHarvest(fees) && <p className="mt-1 text-center text-xs text-muted-foreground">{t("Cosechar y reinvertir se activan desde $0.50 de ganancias.")}</p>}
          <RebalanceButton position={p} className="mt-2 w-full" />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAddTo({ position: p.address, vaultId: p.vaultId as Supported })}><Plus size={14} />{t("Depositar")}</Button>
            <Button size="sm" variant="secondary" disabled={p.outOfRange || !canHarvest(fees)} onClick={() => setHarvest({ position: p.address, vaultId: p.vaultId as Supported, compound: true })}><Repeat size={14} />{t("Reinvertir")}</Button>
            <Button size="sm" variant="outline" disabled={p.locked} onClick={() => setExit({ position: p.address, vaultId: p.vaultId as Supported })}><ArrowDownToLine size={14} />{t("Cerrar")}</Button>
          </div>{p.outOfRange && <p className="mt-2 text-xs leading-5 text-muted-foreground">{p.vaultId === "gta6" ? t("El precio salió del rango: tu dinero sigue seguro pero no genera. Toca «Rebalancear» para volver a centrarla con un toque.") : t("El precio salió del rango de esta bóveda: tu dinero sigue seguro pero no genera ganancias hasta que el precio vuelva o la cierres.")}</p>}</> : <p className="mt-2 text-xs text-muted-foreground">{t("Cosechas y retiros todavía no disponibles para esta posición.")}</p>}
      </li>;
    })}</ul>
    <p className="mt-3 text-[11px] leading-4 text-muted-foreground">{t("PNL = ganancias por cosechar, estimadas al precio actual. APR estimado con las últimas 24h.")}</p>
    {harvest && <HarvestDialog wallet={wallet} position={harvest.position} vaultId={harvest.vaultId} compound={harvest.compound} onClose={() => { setHarvest(null); void query.refetch(); }} />}
    {exit && <WithdrawalSimulation wallet={wallet} {...exit} onClose={() => { setExit(null); void query.refetch(); }} />}
    {addVault && addTo && <DepositSimulation key={addTo.position} vault={addVault} wallet={wallet} position={addTo.position} onClose={() => { setAddTo(null); void query.refetch(); }} />}
  </section>;
}
