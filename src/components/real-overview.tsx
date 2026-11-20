import { HarvestAllDialog, type HarvestTarget } from "@/components/harvest-all-dialog";
import { vaultSkin } from "@/components/vault-skin";
import { MigrateBanner } from "./migrate-banner";
import { LoginSheet } from "./login-nudge";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useQueries } from "@tanstack/react-query";
import { poolYieldOptions } from "@/lib/pool-yield";
import { isOperableVault, type OperableVault } from "@/lib/solana-data";
import { isMigratableVault } from "@/lib/migrate";
import { Plus } from "lucide-react";
import { PoweredBy } from "@/components/powered-by";
import { TokenIcon, hasTokenLogo } from "@/components/token-icon";
import { HotVaultCard } from "@/components/hot-vault-card";
import { useT } from "@/lib/i18n";
import { RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useRealWallet } from "@/hooks/use-real-wallet";
import { usePositionRows } from "@/hooks/use-position-rows";
import { Button } from "@/components/ui/button";
import { NeonLoader, Skeleton } from "@/components/neon-loader";
import { VAULTS, type Vault } from "@/lib/vaults";
import { Suspense, useEffect, useState } from "react";

const PENDING_DEPOSIT = "boveda:pending-deposit";
import { lazyWithReload } from "@/lib/lazy-reload";
import { DepositSimulation } from "@/components/deposit-simulation";
import { WithdrawalSimulation } from "@/components/withdrawal-simulation";
import { PoolYield } from "@/components/pool-yield";
import { HarvestDialog } from "@/components/harvest-dialog";
import { RealPositions, PortfolioEmpty, VaultMiniCards } from "@/components/real-positions";
import { StartGuide } from "@/components/start-guide";
import { VaultSteps } from "@/components/vault-steps";
import { OpenPredictions, useOpenPredictions } from "@/components/open-predictions";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
const PortfolioSummary = lazyWithReload(() => import("./portfolio-summary").then((module) => ({ default: module.PortfolioSummary })));
const RealPortfolioPanel = lazyWithReload(() => import("./real-portfolio-panel").then((module) => ({ default: module.RealPortfolioPanel })));

import { useAutopilot } from "@/components/autopilot-toggle";
import { showManualCompound } from "@/lib/autopilot";
export function RealOverview({ walletAddress, onDetails, portfolioOnly = false }: { walletAddress: string | null; onDetails: (vault: Vault) => void; portfolioOnly?: boolean }) {
  const t = useT();
  const manualCompound = showManualCompound(useAutopilot().status?.failures);
  const [simulationVault, setSimulationVault] = useState<Vault | null>(null);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [withdrawal, setWithdrawal] = useState<{ position?: string; vaultId: OperableVault; migrateTo?: Vault; rotate?: boolean } | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [migrating, setMigrating] = useState(false);
  const session = useBovedaSession();
  const [loginFor, setLoginFor] = useState<Vault | null>(null);
  // Visitors tapping Depositar get the sign-in sheet; the chosen vault opens by itself once the wallet is ready.
  useEffect(() => {
    if (!walletAddress) return;
    let id: string | null = null;
    try { id = sessionStorage.getItem(PENDING_DEPOSIT); sessionStorage.removeItem(PENDING_DEPOSIT); } catch { /* storage blocked */ }
    const v = VAULTS.find((x) => x.id === id);
    if (v && isOperableVault(v.id)) setSimulationVault(v);
  }, [walletAddress]);
  const vaultYields = useQueries({ queries: VAULTS.map((v) => poolYieldOptions(v.pool)) });
  const aprs = Object.fromEntries(VAULTS.map((v, i) => [v.id, vaultYields[i]?.data?.apr ?? null]));
  const migrate = (p: import("@/lib/solana-data").ChainPosition, target: Vault, rotate = false) => { if (walletAddress && isOperableVault(p.vaultId) && isOperableVault(target.id) && target.id !== p.vaultId && !p.locked) setWithdrawal({ position: p.address, vaultId: p.vaultId, migrateTo: target, ...(rotate ? { rotate: true } : {}) }); };
  const [harvest, setHarvest] = useState<{ position: string; vaultId: OperableVault; compound?: boolean } | null>(null);
  const [harvestAll, setHarvestAll] = useState<HarvestTarget[] | null>(null);
  const [unavailableAction, setUnavailableAction] = useState<"harvest" | "exit" | null>(null);
  function openPositionAction(position: import("@/lib/solana-data").ChainPosition, action: "harvest" | "exit" | "compound") {
    const vaultId = position.vaultId;
    const authorized = Boolean(walletAddress) && isOperableVault(vaultId);
    if (!authorized || !isOperableVault(vaultId) || (action === "exit" && position.locked) || (action === "compound" && position.outOfRange)) {
      setUnavailableAction(action === "exit" ? "exit" : "harvest");
      return;
    }
    if (action !== "exit") setHarvest({ position: position.address, vaultId, compound: action === "compound" });
    else setWithdrawal({ position: position.address, vaultId });
  }
  const [tab, setTab] = useState<"all" | "vaults" | "predict">("all");
  const [hotPick, setHotPick] = useState<string | null>(null);
  const [portPick, setPortPick] = useState<string | null>(null);
  // Banners link to /app#open-<vault> so the chosen vault's card opens right away.
  useEffect(() => { const m = /^#open-([\w-]+)$/.exec(window.location.hash); if (m && VAULTS.some((v) => v.id === m[1])) { setHotPick(m[1]!); history.replaceState(history.state, "", window.location.pathname + window.location.search); } }, []);
  const predictions = useOpenPredictions();
  const query = useRealWallet(walletAddress);
  const data = query.data?.success ? query.data.data : null;
  const { rows: feeRows } = usePositionRows(data?.positions ?? []);
  const feesOf = (address: string) => feeRows.find((r) => r.p.address === address)?.fees ?? null;
  const unavailable = query.isFetching ? t("Consultando…") : t("No disponible");
  const predictionsMicro = predictions.items.every((x) => x.valueMicro !== null) ? predictions.items.reduce((sum, x) => sum + BigInt(x.valueMicro ?? "0"), 0n) : null;
  const refresh = walletAddress && <Button variant="outline" size="icon" title={data ? `${t("Actualizar saldo y posiciones")} · ${t("Lectura confirmada en la red ·")} ${new Date(data.checkedAt).toLocaleTimeString("es-MX")}` : t("Actualizar saldo y posiciones")} aria-label={t("Actualizar saldo y posiciones")} disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} className={query.isFetching ? "animate-spin motion-reduce:animate-none" : ""} /></Button>;
  const errors = <>{query.data && !query.data.success && <p role="alert" className="mt-3 text-sm text-destructive">{query.data.error}</p>}
      {query.isError && <p role="alert" className="mt-3 text-sm text-destructive">{t("No se pudo consultar la red. Inténtalo de nuevo.")}</p>}
      {data && !data.positionsComplete && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("La consulta de posiciones está incompleta. No se puede concluir que no tengas posiciones.")}</p>}</>;
  return <>
    {portfolioOnly ? <section aria-label={t("Resumen del portafolio")} className="border-y border-border py-8">
      <div className="flex items-center justify-between gap-3"><h1 className="font-display text-2xl font-semibold">{t("Mi Portafolio")}</h1>{refresh}</div>
      {!walletAddress && <p className="mt-3 text-sm text-muted-foreground">{t("Conecta tu wallet para ver tu portafolio.")}</p>}
      {errors}
      {data && <VaultMiniCards positions={data.positions} onOpen={setPortPick} />}{data && <MigrateBanner positions={data.positions} onMigrate={migrate} />}
    </section> : <section aria-label={t("Bóvedas de rendimiento")} className="pb-1 pt-1">
      <div className="flex items-center justify-between gap-3"><h1 className="font-display text-2xl font-semibold">{t("Bóvedas de rendimiento")}</h1>{refresh}</div>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{t("Pon tus dólares a generar intereses diarios. Retiras o cosechas cuando quieras.")}</p>
      {errors}
    </section>}
    {portfolioOnly && walletAddress && <Suspense fallback={<div className="mt-6 space-y-4"><Skeleton className="h-64" /><Skeleton className="h-28" /></div>}><PortfolioSummary wallet={walletAddress} positions={data?.positions ?? []} positionsComplete={Boolean(data?.positionsComplete)} predictionsMicro={predictionsMicro} onHarvest={(p) => openPositionAction(p, "harvest")} onHarvestAll={(ps) => setHarvestAll(ps.filter((p) => isOperableVault(p.vaultId)).map((p) => ({ position: p.address, vaultId: p.vaultId as OperableVault })))} /></Suspense>}
    {portfolioOnly && (() => { const nv = data?.positions.length ?? 0, np = predictions.items.length; const tabs = [{ id: "all", label: t("Todas"), n: nv + np }, { id: "vaults", label: t("Bóvedas"), n: nv }, { id: "predict", label: t("Sube / Baja"), n: np }] as const; return <div role="tablist" aria-label={t("Posiciones abiertas")} className="mt-8 flex gap-2 overflow-x-auto">{tabs.map((x) => <button key={x.id} role="tab" aria-selected={tab === x.id} onClick={() => setTab(x.id)} className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${tab === x.id ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card text-foreground hover:bg-secondary"}`}>{x.label}<span className={`rounded-full px-2 text-xs ${tab === x.id ? "bg-primary-foreground/20" : "bg-muted"}`}>{x.n}</span></button>)}</div>; })()}
    {portfolioOnly && tab !== "vaults" && predictions.items.length > 0 && <section aria-label={t("Predicciones abiertas")} className="border-b border-border py-8"><OpenPredictions state={predictions} /></section>}
    {portfolioOnly && tab !== "predict" && walletAddress && !data && query.isFetching && <div className="mt-6 space-y-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>}
    {portfolioOnly && data && (() => { const pp = data.positions.filter((p) => p.address === portPick); return <Dialog open={pp.length > 0} onOpenChange={(o) => { if (!o) setPortPick(null); }}><ActionSheetContent><DialogTitle className="sr-only">{t("Tu bóveda")}</DialogTitle><DialogDescription className="sr-only">{t("Detalles de tu bóveda")}</DialogDescription>{pp.length > 0 && <RealPositions showHarvestBanner={false} positions={pp} onAction={(p, k) => { setPortPick(null); openPositionAction(p, k); }} onMigrate={(p, v) => { setPortPick(null); migrate(p, v); }} onRotate={(p, v) => { setPortPick(null); migrate(p, v, true); }} onDeposit={(p) => { setPortPick(null); const v = VAULTS.find((x) => x.id === p.vaultId); if (v && walletAddress) { setAddTo(p.address); setSimulationVault(v); } }} />}</ActionSheetContent></Dialog>; })()}
    {portfolioOnly && <Suspense fallback={<NeonLoader minHeight="min-h-40" />}><RealPortfolioPanel data={data} wallet={walletAddress} /></Suspense>}
    {data?.positionsComplete && data.positions.length === 0 && portfolioOnly && tab !== "predict" && <PortfolioEmpty />}
    {!portfolioOnly && <><div className="mb-1 mt-1 flex justify-end"><PoweredBy brand="meteora" /></div>
    {(() => { const sorted = [...VAULTS].sort((a, b) => { const has = (v: Vault) => data?.positions.some((p) => p.vaultId === v.id) ?? false; if (has(a) !== has(b)) return has(a) ? -1 : 1; return has(a) ? (aprs[b.id] ?? -1) - (aprs[a.id] ?? -1) : Number(Boolean(b.badge)) - Number(Boolean(a.badge)); }); const card = (vault: Vault) => { const own = data?.positions.find((p) => p.vaultId === vault.id); const ownCount = data?.positions.filter((p) => p.vaultId === vault.id).length ?? 0; const ownedLink = ownCount > 0 ? <Link to="/portfolio" hash={`vault-${vault.id}`} className="cta-attn mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-primary bg-primary px-3 py-2 text-center text-xs font-extrabold leading-tight text-primary-foreground shadow-md ring-2 ring-primary/30 transition active:scale-95 sm:text-sm">💼 {t("Tienes capital aquí · Ver en Portafolio")} →</Link> : null; const owned = null; const openDeposit = () => { setHotPick(null); if (!walletAddress && !session.authenticated) { try { sessionStorage.setItem(PENDING_DEPOSIT, vault.id); } catch { /* storage blocked */ } setLoginFor(vault); return; } const o = data?.positions.find((p) => p.vaultId === vault.id && !p.locked); setAddTo(o?.address ?? null); setSimulationVault(vault); }; const canAdd = data?.positions.some((p) => p.vaultId === vault.id && !p.locked) ?? false; const blocked = !isOperableVault(vault.id) || (!walletAddress && session.authenticated); if (vault.badge) return <HotVaultCard key={vault.id} vault={vault} owned={owned} ownedLink={ownedLink} hasPosition={canAdd} depositDisabled={blocked} onDeposit={openDeposit} onDetails={() => { setHotPick(null); onDetails(vault); }} />; return <article key={vault.id} className="flex flex-col rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2"><h3 className="flex min-w-0 items-center gap-2 font-display text-lg font-semibold">{hasTokenLogo(vault.pair.split("/")[0] ?? "") && <TokenIcon symbol={vault.pair.split("/")[0] ?? ""} size={24} />}{t(vault.name)}</h3>{vault.badge ? <span className="shrink-0 animate-pulse rounded-full border border-primary/50 bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary motion-reduce:animate-none">{t(vault.badge)}</span> : <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t("Riesgo")}{" "}{t(vault.risk)}</span>}</div>
      <PoolYield compact address={vault.pool} />
      {ownedLink}
      {owned}
      {/* Full blurb and note live in pool details; the card keeps two lines so it fits one phone screen. */}<p className={`mt-2 flex-1 line-clamp-2 text-xs leading-5 ${vault.badge ? "font-medium text-foreground" : "text-muted-foreground"}`}>{t(vault.blurb)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2"><Button variant="outline" className="h-10 w-full" onClick={() => { setHotPick(null); onDetails(vault); }}>{t("Detalles de la bóveda")}</Button>
      <Button variant="default" className="h-11 w-full text-base font-bold shadow-md ring-2 ring-primary/30" disabled={blocked} onClick={openDeposit}>{canAdd ? <><Plus size={18} strokeWidth={3} />{t("Depositar más")}</> : t("Depositar")}</Button></div>
    </article>; }; const sel = sorted.find((v) => v.id === hotPick) ?? null; return <><p className="mb-2 text-xs text-muted-foreground">{t("Toca una bóveda para ver todo y depositar.")}</p><div aria-label={t("Bóvedas disponibles")} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">{sorted.map((v) => { const mine = data?.positions.some((p) => p.vaultId === v.id); return <button key={v.id} type="button" onClick={() => setHotPick(v.id)} className={`${vaultSkin(v.id)} ${v.id === "trump" ? "trump-pill" : v.id === "dcty" ? "dcty-pill" : v.badge ? "gta-pill" : ""} relative flex min-w-0 items-center overflow-hidden rounded-2xl border-2 px-3 py-3.5 text-left transition active:scale-95 ${v.badge ? "border-hot bg-[image:var(--gradient-hot-surface)] text-hot-foreground shadow-[var(--shadow-hot)]" : v.id === "sol" ? "border-chart-2/60 bg-gradient-to-br from-chart-2/20 to-card" : "border-chart-4/60 bg-gradient-to-br from-chart-4/20 to-card"} ${mine ? "pill-active ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>{v.badge && <span aria-hidden className="hot-ring absolute inset-x-0 bottom-0 h-0.5" />}{mine && <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-foreground not-italic"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live shadow-[0_0_6px_var(--live)] motion-reduce:animate-none" />Live</span>}<span className={`min-w-0 overflow-visible pr-1.5 font-display text-base font-extrabold leading-tight whitespace-nowrap ${v.badge ? "italic uppercase tracking-tight text-hot-2 [text-shadow:0_0_10px_var(--hot)]" : ""}`}>{t(v.name).replace(/^Bóveda /, "").replace(/ Vault$/i, "")}{v.id === "trump" && <span className="mt-0.5 block text-[0.6rem] font-semibold not-italic tracking-[0.3em] text-[color:var(--trump-gold,#caa75e)] [text-shadow:none]">{t("Oficial").toUpperCase()}</span>}</span></button>; })}</div><Dialog open={!!sel} onOpenChange={(o) => { if (!o) setHotPick(null); }}><ActionSheetContent>{sel && <><DialogTitle className="sr-only">{t(sel.name)}</DialogTitle><DialogDescription className="sr-only">{t("Detalles y depósito de la bóveda")}</DialogDescription>{(() => { const mineP = data?.positions.filter((p) => p.vaultId === sel.id) ?? []; return mineP.length > 0 ? <><RealPositions showHarvestBanner={false} positions={mineP} onAction={(p, k) => { setHotPick(null); openPositionAction(p, k); }} onMigrate={(p, v) => { setHotPick(null); migrate(p, v); }} onRotate={(p, v) => { setHotPick(null); migrate(p, v, true); }} onDeposit={(p) => { setHotPick(null); if (walletAddress) { setAddTo(p.address); setSimulationVault(sel); } }} /><Button variant="outline" className="h-10 w-full" onClick={() => { setHotPick(null); onDetails(sel); }}>{t("Detalles de la bóveda")}</Button></> : card(sel); })()}</>}</ActionSheetContent></Dialog></>; })()}{!(data && data.positions.length > 0) && <><VaultSteps className="mt-6" /><StartGuide className="mt-4" /></>}</>}
    <LoginSheet open={!!loginFor} onOpenChange={(o) => { if (!o) setLoginFor(null); }} title={t("Entra para depositar")} body={loginFor ? t("Al entrar te llevamos directo a {v} para depositar.", { v: t(loginFor.name) }) : undefined} />
    {simulationVault && <DepositSimulation key={`${simulationVault.id}-${addTo ?? "new"}`} vault={simulationVault} wallet={walletAddress} {...(addTo ? { position: addTo } : {})} initialAmount={depositAmount} migrate={migrating} onClose={() => { setSimulationVault(null); setAddTo(null); setDepositAmount(""); setMigrating(false); }} />}
    {harvestAll && walletAddress && <HarvestAllDialog wallet={walletAddress} targets={harvestAll} onClose={() => setHarvestAll(null)} />}
    {harvest && walletAddress && <HarvestDialog wallet={walletAddress} position={harvest.position} vaultId={harvest.vaultId} onClose={() => setHarvest(null)} compound={harvest.compound} />}
    {withdrawal && <WithdrawalSimulation wallet={walletAddress} {...withdrawal} onClose={() => setWithdrawal(null)} onMigrated={(usdc, target) => { setWithdrawal(null); if (target) { setAddTo(null); setDepositAmount(usdc); setMigrating(true); setSimulationVault(target); } }} />}
    <Dialog open={unavailableAction !== null} onOpenChange={(open) => { if (!open) setUnavailableAction(null); }}>
      <DialogContent>
        <DialogTitle>{unavailableAction === "harvest" ? t("Cosechar Ganancias") : t("Cerrar y Liquidar")}</DialogTitle>
        <DialogDescription>{t("Esta operación todavía no está habilitada para esta posición.")}</DialogDescription>
        <p className="text-sm leading-6 text-muted-foreground">{t("Puedes operar las posiciones de las bóvedas de BÓVEDA con su wallet propietaria. La liquidez bloqueada no se puede liquidar y no se reinvierte mientras el precio esté fuera de rango. No se ha solicitado ninguna firma ni se ha movido dinero.")}</p>
        <Button variant="outline" onClick={() => setUnavailableAction(null)}>{t("Volver a mis posiciones")}</Button>
      </DialogContent>
    </Dialog>
  </>;
}