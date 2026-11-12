import { PoweredBy } from "@/components/powered-by";
import { TokenIcon } from "@/components/token-icon";
import { useT } from "@/lib/i18n";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { VAULTS, type Vault } from "@/lib/vaults";
import { getRealWallet } from "@/lib/solana.functions";
import { Suspense, useState } from "react";
import { lazyWithReload } from "@/lib/lazy-reload";
import { DepositSimulation } from "@/components/deposit-simulation";
import { WithdrawalSimulation } from "@/components/withdrawal-simulation";
import { PoolYield } from "@/components/pool-yield";
import { HarvestDialog } from "@/components/harvest-dialog";
import { BuyUsdc } from "@/components/buy-usdc";
import { RealPositions, PortfolioEmpty } from "@/components/real-positions";
import { StartGuide } from "@/components/start-guide";
import { VaultSteps } from "@/components/vault-steps";
import { OpenPredictions, useOpenPredictions } from "@/components/open-predictions";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
const RealPortfolioPanel = lazyWithReload(() => import("./real-portfolio-panel").then((module) => ({ default: module.RealPortfolioPanel })));

export function RealOverview({ walletAddress, onDetails, portfolioOnly = false }: { walletAddress: string | null; onDetails: (vault: Vault) => void; portfolioOnly?: boolean }) {
  const t = useT();
  const [simulationVault, setSimulationVault] = useState<Vault | null>(null);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [withdrawal, setWithdrawal] = useState<{ position?: string; vaultId: "sol" | "met" } | null>(null);
  const [harvest, setHarvest] = useState<{ position: string; vaultId: "sol" | "met"; compound?: boolean } | null>(null);
  const [unavailableAction, setUnavailableAction] = useState<"harvest" | "exit" | null>(null);
  function openPositionAction(position: import("@/lib/solana-data").ChainPosition, action: "harvest" | "exit" | "compound") {
    const vaultId = position.vaultId;
    const authorized = Boolean(walletAddress) && (vaultId === "sol" || vaultId === "met");
    if (!authorized || (vaultId !== "sol" && vaultId !== "met") || (action === "exit" && position.locked)) {
      setUnavailableAction(action === "exit" ? "exit" : "harvest");
      return;
    }
    if (action !== "exit") setHarvest({ position: position.address, vaultId, compound: action === "compound" });
    else setWithdrawal({ position: position.address, vaultId });
  }
  const [tab, setTab] = useState<"all" | "vaults" | "predict">("all");
  const predictions = useOpenPredictions();
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
      <div className="flex items-center gap-3"><ShieldAlert className="shrink-0 text-primary" size={24} /><h1 className="font-display text-2xl font-semibold">{portfolioOnly ? t("Tu portafolio") : t("Bóvedas")}</h1></div>
      {!portfolioOnly && <VaultSteps className="mt-4" />}
      <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/80">{t("Deposita entre 1 y 10,000 USDC en las bóvedas SOL y MET. Cosecha comisiones o liquida tus posiciones compatibles de SOL y MET, revisando los importes antes de firmar. Las posiciones bloqueadas no se pueden liquidar.")}</p>
      {walletAddress && <div className="mt-4 flex flex-wrap items-center gap-3"><p className="min-w-0 break-all text-xs text-muted-foreground">{t("Wallet conectada:")}{" "}{walletAddress}</p><Button variant="outline" size="icon" title={t("Actualizar saldo y posiciones")} aria-label={t("Actualizar saldo y posiciones")} disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button></div>}
      {!portfolioOnly && <StartGuide className="mt-4" />}
      <BuyUsdc className="mt-4" />
      {query.data && !query.data.success && <p role="alert" className="mt-3 text-sm text-destructive">{query.data.error}</p>}
      {query.isError && <p role="alert" className="mt-3 text-sm text-destructive">{t("No se pudo consultar la red. Inténtalo de nuevo.")}</p>}
      <dl className="mt-6 grid gap-5">
        <div><dt className="text-sm text-muted-foreground">{t("Posiciones en estos pools")}</dt><dd className="mt-1 font-display text-xl">{data?.positionsComplete ? data.positions.length : walletAddress ? unavailable : t("Conecta tu wallet")}</dd></div>
      </dl>
      {data && <p className="mt-4 text-xs text-muted-foreground">{t("Lectura confirmada en la red ·")}{" "}{new Date(data.checkedAt).toLocaleTimeString("es-MX")} {t("· no autoriza movimientos")}</p>}
      {data && !data.positionsComplete && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("La consulta de posiciones está incompleta. No se puede concluir que no tengas posiciones.")}</p>}
    </section>
    {portfolioOnly && (() => { const nv = data?.positions.length ?? 0, np = predictions.items.length; const tabs = [{ id: "all", label: t("Todas"), n: nv + np }, { id: "vaults", label: t("Bóvedas"), n: nv }, { id: "predict", label: t("Sube / Baja"), n: np }] as const; return <div role="tablist" aria-label={t("Posiciones abiertas")} className="mt-8 flex gap-2 overflow-x-auto">{tabs.map((x) => <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${tab === x.id ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card text-foreground hover:bg-secondary"}`}>{x.label}<span className={`rounded-full px-2 text-xs ${tab === x.id ? "bg-primary-foreground/20" : "bg-muted"}`}>{x.n}</span></button>)}</div>; })()}
    {portfolioOnly && tab !== "vaults" && <section aria-label={t("Predicciones abiertas")} className="border-b border-border py-8"><h2 className="mb-4 font-display text-lg font-semibold">{t("Predicciones abiertas")}</h2><OpenPredictions state={predictions} /></section>}
    {portfolioOnly && tab !== "predict" && data && data.positions.length > 0 && <RealPositions positions={data.positions} onAction={openPositionAction} onDeposit={(p) => { const v = VAULTS.find((x) => x.id === p.vaultId); if (v && walletAddress) { setAddTo(p.address); setSimulationVault(v); } }} />}
    {portfolioOnly && <Suspense fallback={<p role="status">{t("Cargando portafolio…")}</p>}><RealPortfolioPanel data={data} wallet={walletAddress} /></Suspense>}
    {data?.positionsComplete && data.positions.length === 0 && portfolioOnly && tab !== "predict" && <PortfolioEmpty />}
    {!portfolioOnly && data && data.positions.length > 0 && <RealPositions positions={data.positions} onAction={openPositionAction} onDeposit={(p) => { const v = VAULTS.find((x) => x.id === p.vaultId); if (v && walletAddress) { setAddTo(p.address); setSimulationVault(v); } }} />}
    {!portfolioOnly && <><div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">{t("Bóvedas disponibles")}</h2><PoweredBy brand="meteora" /></div>
    <div className="grid gap-4 md:grid-cols-2">{VAULTS.map((vault) => <article key={vault.id} className="flex flex-col rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{t("Pool de liquidez")}</span><span>{t("Riesgo")}{" "}{t(vault.risk)}</span></div><h3 className="mt-4 flex items-center gap-2 font-display text-xl font-semibold"><TokenIcon symbol={vault.pair.split("/")[0] ?? ""} size={28} />{t(vault.name)}</h3><p className="mt-1 text-sm text-muted-foreground">{vault.pair}</p>
      <PoolYield address={vault.pool} />
      <p className="mt-5 flex-1 text-sm leading-6 text-muted-foreground">{t(vault.blurb)}</p>
      <Button variant="outline" className="mt-4 w-full" onClick={() => onDetails(vault)}>{t("Detalles del pool")}</Button>
      <Button variant="secondary" className="mt-2 w-full" disabled={!walletAddress || (vault.id !== "sol" && vault.id !== "met")} onClick={() => { setAddTo(null); setSimulationVault(vault); }}>{t("Depositar USDC")}</Button>

    </article>)}</div></>}
    {simulationVault && <DepositSimulation key={`${simulationVault.id}-${addTo ?? "new"}`} vault={simulationVault} wallet={walletAddress} {...(addTo ? { position: addTo } : {})} onClose={() => { setSimulationVault(null); setAddTo(null); }} />}
    {harvest && walletAddress && <HarvestDialog wallet={walletAddress} position={harvest.position} vaultId={harvest.vaultId} onClose={() => setHarvest(null)} compound={harvest.compound} />}
    {withdrawal && <WithdrawalSimulation wallet={walletAddress} {...withdrawal} onClose={() => setWithdrawal(null)} />}
    <Dialog open={unavailableAction !== null} onOpenChange={(open) => { if (!open) setUnavailableAction(null); }}>
      <DialogContent>
        <DialogTitle>{unavailableAction === "harvest" ? t("Cosechar Ganancias") : t("Cerrar y Liquidar")}</DialogTitle>
        <DialogDescription>{t("Esta operación todavía no está habilitada para esta posición.")}</DialogDescription>
        <p className="text-sm leading-6 text-muted-foreground">{t("Puedes operar posiciones compatibles de SOL y MET con su wallet propietaria. La liquidez bloqueada no se puede liquidar. No se ha solicitado ninguna firma ni se ha movido dinero.")}</p>
        <Button variant="outline" onClick={() => setUnavailableAction(null)}>{t("Volver a mis posiciones")}</Button>
      </DialogContent>
    </Dialog>
  </>;
}