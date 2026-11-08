import { RefreshCw, ShieldAlert, Sprout, ArrowDownToLine } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { VAULTS, type Vault } from "@/lib/vaults";
import { getRealWallet } from "@/lib/solana.functions";
import { lazy, Suspense, useState } from "react";
import { DepositSimulation } from "@/components/deposit-simulation";
import { WithdrawalSimulation } from "@/components/withdrawal-simulation";
import { WITHDRAWAL_PILOT } from "@/lib/withdrawal";
import { PoolYield } from "@/components/pool-yield";
import { HarvestDialog } from "@/components/harvest-dialog";
import { BuyUsdc } from "@/components/buy-usdc";
const RealPortfolioPanel = lazy(() => import("./real-portfolio-panel").then((module) => ({ default: module.RealPortfolioPanel })));

export function RealOverview({ walletAddress, onDetails, portfolioOnly = false }: { walletAddress: string | null; onDetails: (vault: Vault) => void; portfolioOnly?: boolean }) {
  const [simulationVault, setSimulationVault] = useState<Vault | null>(null);
  const [withdrawal, setWithdrawal] = useState<{ position?: string; vaultId: "sol" | "met" } | null>(null);
  const [harvest, setHarvest] = useState<{ position: string; vaultId: "sol" | "met" } | null>(null);
  const readWallet = useServerFn(getRealWallet);
  const query = useQuery({
    queryKey: ["real-solana", walletAddress],
    queryFn: () => {
      if (!walletAddress) throw new Error("Selecciona una wallet");
      return readWallet({ data: { wallet: walletAddress } });
    },
    enabled: Boolean(walletAddress), staleTime: 30_000, retry: false,
  });
  const data = query.data?.success ? query.data.data : null;
  const unavailable = query.isFetching ? "Consultando…" : "No disponible";
  return <>
    <section aria-label="Estado del modo Real" className="border-y border-border py-8">
      <div className="flex items-center gap-3"><ShieldAlert className="shrink-0 text-primary" size={24} /><h1 className="font-display text-2xl font-semibold">{portfolioOnly ? "Tu portafolio · Real" : "BÓVEDA · Real"}</h1></div>
      <p role="status" className="mt-4 font-semibold">Piloto limitado en Mainnet</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Depósitos entre 1 y 10,000 USDC en SOL/MET. Las nuevas posiciones no se pueden cosechar ni retirar desde BÓVEDA. La liquidación a USDC está limitada a la posición SOL autorizada del piloto, tras verificar mínimos, comisión y renta. Cosechar Ganancias está en piloto para la misma posición; las demás operaciones siguen en simulación.</p>
      {walletAddress && <div className="mt-4 flex flex-wrap items-center gap-3"><p className="min-w-0 break-all text-xs text-muted-foreground">Wallet conectada: {walletAddress}</p><Button variant="outline" size="icon" title="Actualizar saldo y posiciones" aria-label="Actualizar saldo y posiciones" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button></div>}
      <BuyUsdc className="mt-4" />
      {query.data && !query.data.success && <p role="alert" className="mt-3 text-sm text-destructive">{query.data.error}</p>}
      {query.isError && <p role="alert" className="mt-3 text-sm text-destructive">No se pudo consultar la red. Inténtalo de nuevo.</p>}
      <dl className="mt-6 grid gap-5 sm:grid-cols-3">
        <div><dt className="text-sm text-muted-foreground">Saldo USDC en tu wallet</dt><dd className="mt-1 break-all font-display text-xl">{data ? `${data.usdc} USDC` : walletAddress ? unavailable : "Conecta tu wallet"}</dd></div>
        <div><dt className="text-sm text-muted-foreground">SOL para costes de red</dt><dd className="mt-1 break-all font-display text-xl">{data ? `${data.sol} SOL` : walletAddress ? unavailable : "Conecta tu wallet"}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Posiciones en estos pools</dt><dd className="mt-1 font-display text-xl">{data?.positionsComplete ? data.positions.length : walletAddress ? unavailable : "Conecta tu wallet"}</dd></div>
      </dl>
      {data && <p className="mt-4 text-xs text-muted-foreground">Lectura confirmada en la red · {new Date(data.checkedAt).toLocaleTimeString("es-MX")} · no autoriza movimientos</p>}
      {data && !data.positionsComplete && <p role="status" className="mt-3 text-sm text-muted-foreground">La consulta de posiciones está incompleta. No se puede concluir que no tengas posiciones.</p>}
      <p className="mt-5 text-xs leading-5 text-muted-foreground">Los créditos y las posiciones de Prueba no aparecen en Real y no se pueden convertir en dinero.</p>
    </section>
    {data && data.positions.length > 0 && <section aria-label="Posiciones reales" className="border-b border-border py-8"><h2 className="font-display text-lg font-semibold">Mis posiciones</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">Estimaciones en tokens, no valor total en USD ni mínimos de liquidación. Bloqueos, precios y costes pueden alterar el resultado.</p><div className="mt-4 space-y-4">{data.positions.map((position) => <article key={position.address} className="rounded-lg border border-border bg-card p-5"><h3 className="font-display font-semibold">{VAULTS.find((vault) => vault.id === position.vaultId)?.name ?? `${position.symbol}/USDC`}</h3><p className="mt-2 break-all font-mono text-xs text-muted-foreground">{position.address}</p><p className="mt-3 break-all text-sm">Liquidez estimada: {position.tokenAmount === null ? "No disponible" : `${position.tokenAmount} ${position.symbol} + ${position.usdcAmount} USDC`}</p><p className="mt-2 break-all text-sm text-muted-foreground">Comisiones acumuladas: {position.feeTokenAmount === null ? "No disponibles" : `${position.feeTokenAmount} ${position.symbol} + ${position.feeUsdcAmount} USDC`}</p>{position.locked && <p className="mt-2 text-xs text-muted-foreground">Incluye liquidez bloqueada; no toda la posición es retirable.</p>}<div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" disabled={position.vaultId !== "sol" && position.vaultId !== "met"} onClick={() => setHarvest({ position: position.address, vaultId: position.vaultId === "sol" ? "sol" : "met" })}><Sprout size={16} />Cosechar Ganancias</Button><Button variant="outline" disabled={position.locked || (position.vaultId !== "sol" && position.vaultId !== "met")} onClick={() => setWithdrawal({ position: position.address, vaultId: position.vaultId === "sol" ? "sol" : "met" })}><ArrowDownToLine size={16} />Cerrar y Liquidar</Button></div><p className="mt-3 text-xs leading-5 text-muted-foreground">Cosecha: simula primero; firma limitada a la posición SOL del piloto. {walletAddress === WITHDRAWAL_PILOT.wallet && position.address === WITHDRAWAL_PILOT.position ? "Liquidación piloto: revisa el mínimo y la comisión antes de firmar." : "Liquidación: solo simulación; firma limitada a la posición SOL autorizada del piloto."}</p></article>)}</div></section>}
    {portfolioOnly && <Suspense fallback={<p role="status">Cargando portafolio…</p>}><RealPortfolioPanel data={data} wallet={walletAddress} /></Suspense>}
    {data?.positionsComplete && data.positions.length === 0 && portfolioOnly && <p className="border-b border-border py-8 text-muted-foreground">No tienes posiciones activas en estas bóvedas. Las posiciones cerradas no aparecen aquí; puedes consultar sus comprobantes en Actividad.</p>}
    {!portfolioOnly && <><h2 className="mb-4 mt-10 font-display text-lg font-semibold">Bóvedas disponibles</h2>
    <div className="grid gap-4 md:grid-cols-3">{VAULTS.map((vault) => <article key={vault.id} className="flex flex-col rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Pool de liquidez</span><span>Riesgo {vault.risk}</span></div><h3 className="mt-4 font-display text-xl font-semibold">{vault.name}</h3><p className="mt-1 text-sm text-muted-foreground">{vault.pair}</p>
      <PoolYield address={vault.pool} />
      <p className="mt-5 flex-1 text-sm leading-6 text-muted-foreground">{vault.blurb}</p>
      <Button variant="outline" className="mt-4 w-full" onClick={() => onDetails(vault)}>Detalles del pool</Button>
      <Button variant="secondary" className="mt-2 w-full" onClick={() => setSimulationVault(vault)}>Simular depósito USDC</Button>
      {(vault.id === "sol" || vault.id === "met") && <Button variant="outline" className="mt-2 w-full" onClick={() => setWithdrawal({ vaultId: vault.id === "sol" ? "sol" : "met" })}>Simular retiro a USDC</Button>}
    </article>)}</div></>}
    {simulationVault && <DepositSimulation key={simulationVault.id} vault={simulationVault} wallet={walletAddress} onClose={() => setSimulationVault(null)} />}
    {harvest && walletAddress && <HarvestDialog wallet={walletAddress} {...harvest} onClose={() => setHarvest(null)} />}
    {withdrawal && <WithdrawalSimulation wallet={walletAddress} {...withdrawal} onClose={() => setWithdrawal(null)} />}
  </>;
}