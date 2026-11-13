import { Plus } from "lucide-react";
import { PoweredBy } from "@/components/powered-by";
import { TokenIcon } from "@/components/token-icon";
import { useT } from "@/lib/i18n";
import { RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
const PortfolioSummary = lazyWithReload(() => import("./portfolio-summary").then((module) => ({ default: module.PortfolioSummary })));
const RealPortfolioPanel = lazyWithReload(() => import("./real-portfolio-panel").then((module) => ({ default: module.RealPortfolioPanel })));

export function RealOverview({ walletAddress, onDetails, portfolioOnly = false }: { walletAddress: string | null; onDetails: (vault: Vault) => void; portfolioOnly?: boolean }) {
  const t = useT();
  const [simulationVault, setSimulationVault] = useState<Vault | null>(null);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [withdrawal, setWithdrawal] = useState<{ position?: string; vaultId: "sol" | "met"; migrateTo?: Vault; rotate?: boolean } | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [migrating, setMigrating] = useState(false);
  const migrate = (p: import("@/lib/solana-data").ChainPosition, target: Vault, rotate = false) => { if (walletAddress && (p.vaultId === "sol" || p.vaultId === "met") && !p.locked) setWithdrawal({ position: p.address, vaultId: p.vaultId, migrateTo: target, ...(rotate ? { rotate: true } : {}) }); };
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
  const predictionsMicro = predictions.items.every((x) => x.valueMicro !== null) ? predictions.items.reduce((sum, x) => sum + BigInt(x.valueMicro ?? "0"), 0n) : null;
  const refresh = walletAddress && <Button variant="outline" size="icon" title={data ? `${t("Actualizar saldo y posiciones")} · ${t("Lectura confirmada en la red ·")} ${new Date(data.checkedAt).toLocaleTimeString("es-MX")}` : t("Actualizar saldo y posiciones")} aria-label={t("Actualizar saldo y posiciones")} disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button>;
  const errors = <>{query.data && !query.data.success && <p role="alert" className="mt-3 text-sm text-destructive">{query.data.error}</p>}
      {query.isError && <p role="alert" className="mt-3 text-sm text-destructive">{t("No se pudo consultar la red. Inténtalo de nuevo.")}</p>}
      {data && !data.positionsComplete && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("La consulta de posiciones está incompleta. No se puede concluir que no tengas posiciones.")}</p>}</>;
  return <>
    {portfolioOnly ? <section aria-label={t("Resumen del portafolio")} className="border-y border-border py-8">
      <div className="flex items-center justify-between gap-3"><h1 className="font-display text-2xl font-semibold">{t("Tu portafolio")}</h1>{refresh}</div>
      {!walletAddress && <p className="mt-3 text-sm text-muted-foreground">{t("Conecta tu wallet para ver tu portafolio.")}</p>}
      {errors}
    </section> : <section aria-label={t("Bóvedas de rendimiento")} className="border-y border-border py-8">
      <div className="flex items-center justify-between gap-3"><h1 className="font-display text-2xl font-semibold">{t("Bóvedas de rendimiento")}</h1>{refresh}</div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("Elige una bóveda para poner a trabajar tus USDC. Revisas los importes antes de firmar.")}</p>
      {!(data && data.positions.length > 0) && <><VaultSteps className="mt-4" /><StartGuide className="mt-4" /></>}
      <BuyUsdc className="mt-4" />
      {errors}
    </section>}
    {portfolioOnly && (() => { const nv = data?.positions.length ?? 0, np = predictions.items.length; const tabs = [{ id: "all", label: t("Todas"), n: nv + np }, { id: "vaults", label: t("Bóvedas"), n: nv }, { id: "predict", label: t("Sube / Baja"), n: np }] as const; return <div role="tablist" aria-label={t("Posiciones abiertas")} className="mt-8 flex gap-2 overflow-x-auto">{tabs.map((x) => <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${tab === x.id ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card text-foreground hover:bg-secondary"}`}>{x.label}<span className={`rounded-full px-2 text-xs ${tab === x.id ? "bg-primary-foreground/20" : "bg-muted"}`}>{x.n}</span></button>)}</div>; })()}
    {portfolioOnly && tab !== "vaults" && predictions.items.length > 0 && <section aria-label={t("Predicciones abiertas")} className="border-b border-border py-8"><OpenPredictions state={predictions} /></section>}
    {portfolioOnly && tab !== "predict" && data && data.positions.length > 0 && <RealPositions showHarvestBanner={false} positions={data.positions} onAction={openPositionAction} onMigrate={migrate} onRotate={(p, v) => migrate(p, v, true)} onDeposit={(p) => { const v = VAULTS.find((x) => x.id === p.vaultId); if (v && walletAddress) { setAddTo(p.address); setSimulationVault(v); } }} />}
    {portfolioOnly && walletAddress && <Suspense fallback={<div className="h-28" />}><PortfolioSummary wallet={walletAddress} positions={data?.positions ?? []} positionsComplete={Boolean(data?.positionsComplete)} predictionsMicro={predictionsMicro} onHarvest={(p) => openPositionAction(p, "harvest")} /></Suspense>}
    {portfolioOnly && <Suspense fallback={<p role="status">{t("Cargando portafolio…")}</p>}><RealPortfolioPanel data={data} wallet={walletAddress} /></Suspense>}
    {data?.positionsComplete && data.positions.length === 0 && portfolioOnly && tab !== "predict" && <PortfolioEmpty />}
    {!portfolioOnly && <><div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">{t("Bóvedas disponibles")}</h2><PoweredBy brand="meteora" /></div>
    <div className="grid gap-4 md:grid-cols-2">{VAULTS.map((vault) => <article key={vault.id} className="flex flex-col rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{t("Pool de liquidez")}</span><span>{t("Riesgo")}{" "}{t(vault.risk)}</span></div><h3 className="mt-4 flex items-center gap-2 font-display text-xl font-semibold"><TokenIcon symbol={vault.pair.split("/")[0] ?? ""} size={28} />{t(vault.name)}</h3><p className="mt-1 text-sm text-muted-foreground">{vault.pair}</p>
      <PoolYield address={vault.pool} />
      {(() => { const n = data?.positions.filter((p) => p.vaultId === vault.id).length ?? 0; return n > 0 ? <Link to="/portfolio" className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{t("Tienes capital aquí · Ver en Portafolio")} →</Link> : null; })()}
      <p className="mt-5 flex-1 text-sm leading-6 text-muted-foreground">{t(vault.blurb)}</p>
      <Button variant="outline" className="mt-4 w-full" onClick={() => onDetails(vault)}>{t("Detalles del pool")}</Button>
      <Button variant="secondary" className="mt-2 w-full" disabled={!walletAddress || (vault.id !== "sol" && vault.id !== "met")} onClick={() => { const own = data?.positions.find((p) => p.vaultId === vault.id && !p.locked); setAddTo(own?.address ?? null); setSimulationVault(vault); }}>{data?.positions.some((p) => p.vaultId === vault.id && !p.locked) ? <><Plus size={14} />{t("Añadir más")}</> : t("Depositar USDC")}</Button>

    </article>)}</div></>}
    {simulationVault && <DepositSimulation key={`${simulationVault.id}-${addTo ?? "new"}`} vault={simulationVault} wallet={walletAddress} {...(addTo ? { position: addTo } : {})} initialAmount={depositAmount} migrate={migrating} onClose={() => { setSimulationVault(null); setAddTo(null); setDepositAmount(""); setMigrating(false); }} />}
    {harvest && walletAddress && <HarvestDialog wallet={walletAddress} position={harvest.position} vaultId={harvest.vaultId} onClose={() => setHarvest(null)} compound={harvest.compound} />}
    {withdrawal && <WithdrawalSimulation wallet={walletAddress} {...withdrawal} onClose={() => setWithdrawal(null)} onMigrated={(usdc) => { const target = withdrawal.migrateTo; setWithdrawal(null); if (target) { setAddTo(null); setDepositAmount(usdc); setMigrating(true); setSimulationVault(target); } }} />}
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