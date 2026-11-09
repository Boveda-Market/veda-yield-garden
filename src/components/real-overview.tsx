import { useT } from "@/lib/i18n";
import { RefreshCw, ShieldAlert, Sprout, ArrowDownToLine } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { VAULTS, type Vault } from "@/lib/vaults";
import { getRealWallet } from "@/lib/solana.functions";
import { lazy, Suspense, useState } from "react";
import { DepositSimulation } from "@/components/deposit-simulation";
import { WithdrawalSimulation } from "@/components/withdrawal-simulation";
import { PoolYield } from "@/components/pool-yield";
import { HarvestDialog } from "@/components/harvest-dialog";
import { BuyUsdc } from "@/components/buy-usdc";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
const RealPortfolioPanel = lazy(() => import("./real-portfolio-panel").then((module) => ({ default: module.RealPortfolioPanel })));

export function RealOverview({ walletAddress, onDetails, portfolioOnly = false }: { walletAddress: string | null; onDetails: (vault: Vault) => void; portfolioOnly?: boolean }) {
  const t = useT();
  const [simulationVault, setSimulationVault] = useState<Vault | null>(null);
  const [withdrawal, setWithdrawal] = useState<{ position?: string; vaultId: "sol" | "met" } | null>(null);
  const [harvest, setHarvest] = useState<{ position: string; vaultId: "sol" | "met" } | null>(null);
  const [unavailableAction, setUnavailableAction] = useState<"harvest" | "exit" | null>(null);
  function openPositionAction(position: import("@/lib/solana-data").ChainPosition, action: "harvest" | "exit") {
    const vaultId = position.vaultId;
    const authorized = Boolean(walletAddress) && (vaultId === "sol" || vaultId === "met");
    if (!authorized || (vaultId !== "sol" && vaultId !== "met") || (action === "exit" && position.locked)) {
      setUnavailableAction(action);
      return;
    }
    if (action === "harvest") setHarvest({ position: position.address, vaultId });
    else setWithdrawal({ position: position.address, vaultId });
  }
  const readWallet = useServerFn(getRealWallet);
  const query = useQuery({
    queryKey: ["real-solana", walletAddress],
    queryFn: () => {
      if (!walletAddress) throw new Error(t("Selecciona una wallet"));
      return readWallet({ data: { wallet: walletAddress } });
    },
    enabled: Boolean(walletAddress), staleTime: 30_000, retry: false,
  });
  const data = query.data?.success ? query.data.data : null;
  const unavailable = query.isFetching ? t("Consultando…") : t("No disponible");
  return <>
    <section aria-label={t("Estado del modo Real")} className="border-y border-border py-8">
      <div className="flex items-center gap-3"><ShieldAlert className="shrink-0 text-primary" size={24} /><h1 className="font-display text-2xl font-semibold">{portfolioOnly ? t("Tu portafolio") : t("BÓVEDA")}</h1></div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Deposita entre 1 y 10,000 USDC en las bóvedas SOL y MET. Cosecha comisiones o liquida tus posiciones compatibles de SOL y MET, revisando los importes antes de firmar. SPCX aún no admite operaciones. Las posiciones bloqueadas no se pueden liquidar.")}</p>
      {walletAddress && <div className="mt-4 flex flex-wrap items-center gap-3"><p className="min-w-0 break-all text-xs text-muted-foreground">{t("Wallet conectada:")}{" "}{walletAddress}</p><Button variant="outline" size="icon" title={t("Actualizar saldo y posiciones")} aria-label={t("Actualizar saldo y posiciones")} disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button></div>}
      <BuyUsdc className="mt-4" />
      {query.data && !query.data.success && <p role="alert" className="mt-3 text-sm text-destructive">{query.data.error}</p>}
      {query.isError && <p role="alert" className="mt-3 text-sm text-destructive">{t("No se pudo consultar la red. Inténtalo de nuevo.")}</p>}
      <dl className="mt-6 grid gap-5 sm:grid-cols-3">
        <div><dt className="text-sm text-muted-foreground">{t("Saldo USDC en tu wallet")}</dt><dd className="mt-1 break-all font-display text-xl">{data ? `${data.usdc} USDC` : walletAddress ? unavailable : t("Conecta tu wallet")}</dd></div>
        <div><dt className="text-sm text-muted-foreground">{t("SOL para costes de red")}</dt><dd className="mt-1 break-all font-display text-xl">{data ? `${data.sol} SOL` : walletAddress ? unavailable : t("Conecta tu wallet")}</dd></div>
        <div><dt className="text-sm text-muted-foreground">{t("Posiciones en estos pools")}</dt><dd className="mt-1 font-display text-xl">{data?.positionsComplete ? data.positions.length : walletAddress ? unavailable : t("Conecta tu wallet")}</dd></div>
      </dl>
      {data && <p className="mt-4 text-xs text-muted-foreground">{t("Lectura confirmada en la red ·")}{" "}{new Date(data.checkedAt).toLocaleTimeString("es-MX")} {t("· no autoriza movimientos")}</p>}
      {data && !data.positionsComplete && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("La consulta de posiciones está incompleta. No se puede concluir que no tengas posiciones.")}</p>}
    </section>
    {portfolioOnly && data && data.positions.length > 0 && <section aria-label={t("Posiciones reales")} className="border-b border-border py-8"><h2 className="font-display text-lg font-semibold">{t("Mis posiciones")}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{t("Estimaciones en tokens, no valor total en USD ni mínimos de liquidación. Bloqueos, precios y costes pueden alterar el resultado.")}</p><div className="mt-4 space-y-4">{data.positions.map((position) => <article key={position.address} className="rounded-lg border border-border bg-card p-5"><h3 className="font-display font-semibold">{VAULTS.find((vault) => vault.id === position.vaultId)?.name ?? `${position.symbol}/USDC`}</h3><p className="mt-2 break-all font-mono text-xs text-muted-foreground">{position.address}</p><p className="mt-3 break-all text-sm">{t("Liquidez estimada:")}{" "}{position.tokenAmount === null ? t("No disponible") : `${position.tokenAmount} ${position.symbol} + ${position.usdcAmount} USDC`}</p><p className="mt-2 break-all text-sm text-muted-foreground">{t("Comisiones acumuladas:")}{" "}{position.feeTokenAmount === null ? t("No disponibles") : `${position.feeTokenAmount} ${position.symbol} + ${position.feeUsdcAmount} USDC`}</p>{position.locked && <p className="mt-2 text-xs text-muted-foreground">{t("Incluye liquidez bloqueada; no toda la posición es retirable.")}</p>}<div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={() => openPositionAction(position, "harvest")}><Sprout size={16} />{t("Cosechar Ganancias")}</Button><Button variant="outline" onClick={() => openPositionAction(position, "exit")}><ArrowDownToLine size={16} />{t("Cerrar y Liquidar")}</Button></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{(position.vaultId === "sol" || position.vaultId === "met") ? t("Revisa los importes y la comisión antes de firmar.") : t("Cosechas y retiros todavía no disponibles para esta posición.")}</p></article>)}</div></section>}
    {portfolioOnly && <Suspense fallback={<p role="status">{t("Cargando portafolio…")}</p>}><RealPortfolioPanel data={data} wallet={walletAddress} /></Suspense>}
    {data?.positionsComplete && data.positions.length === 0 && portfolioOnly && <p className="border-b border-border py-8 text-muted-foreground">{t("No tienes posiciones activas en estas bóvedas. Las posiciones cerradas no aparecen aquí; puedes consultar sus comprobantes en Movimientos de bóvedas.")}</p>}
    {!portfolioOnly && <><h2 className="mb-4 mt-10 font-display text-lg font-semibold">{t("Bóvedas disponibles")}</h2>
    <div className="grid gap-4 md:grid-cols-3">{VAULTS.map((vault) => <article key={vault.id} className="flex flex-col rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{t("Pool de liquidez")}</span><span>{t("Riesgo")}{" "}{t(vault.risk)}</span></div><h3 className="mt-4 font-display text-xl font-semibold">{t(vault.name)}</h3><p className="mt-1 text-sm text-muted-foreground">{vault.pair}</p>
      <PoolYield address={vault.pool} />
      <p className="mt-5 flex-1 text-sm leading-6 text-muted-foreground">{t(vault.blurb)}</p>
      <Button variant="outline" className="mt-4 w-full" onClick={() => onDetails(vault)}>{t("Detalles del pool")}</Button>
      <Button variant="secondary" className="mt-2 w-full" disabled={!walletAddress || (vault.id !== "sol" && vault.id !== "met")} onClick={() => setSimulationVault(vault)}>{t("Depositar USDC")}</Button>

    </article>)}</div></>}
    {simulationVault && <DepositSimulation key={simulationVault.id} vault={simulationVault} wallet={walletAddress} onClose={() => setSimulationVault(null)} />}
    {harvest && walletAddress && <HarvestDialog wallet={walletAddress} {...harvest} onClose={() => setHarvest(null)} />}
    {withdrawal && <WithdrawalSimulation wallet={walletAddress} {...withdrawal} onClose={() => setWithdrawal(null)} />}
    <Dialog open={unavailableAction !== null} onOpenChange={(open) => { if (!open) setUnavailableAction(null); }}>
      <DialogContent>
        <DialogTitle>{unavailableAction === "harvest" ? t("Cosechar Ganancias") : t("Cerrar y Liquidar")}</DialogTitle>
        <DialogDescription>{t("Esta operación todavía no está habilitada para esta posición.")}</DialogDescription>
        <p className="text-sm leading-6 text-muted-foreground">{t("Puedes operar posiciones compatibles de SOL y MET con su wallet propietaria. SPCX aún no admite operaciones y la liquidez bloqueada no se puede liquidar. No se ha solicitado ninguna firma ni se ha movido dinero.")}</p>
        <Button variant="outline" onClick={() => setUnavailableAction(null)}>{t("Volver a mis posiciones")}</Button>
      </DialogContent>
    </Dialog>
  </>;
}