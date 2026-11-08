import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ShieldAlert, ArrowDownToLine, LogOut, Sprout, Vault as VaultIcon, Wallet, LayoutDashboard, PieChart, History, UserRound, Home } from "lucide-react";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { demoSessionKey, readDemoSession } from "@/lib/demo-session";
import { VAULTS, accrued, type Position, type Vault } from "@/lib/vaults";
import { Button } from "@/components/ui/button";
import { PoolDetails } from "@/components/pool-details";
import { transactionAmounts, validDeposit } from "@/lib/fees";
import { FeeBreakdown } from "@/components/fee-breakdown";
import { ModeSelector } from "@/components/mode-selector";
import { RealOverview } from "@/components/real-overview";
import { canUseTrial, type AppMode } from "@/lib/app-mode";
import { AccountSettings } from "@/components/account-settings";
import { ActivityView } from "@/components/activity-view";
import { guestDemoKey, readTrialActivity, trialActivityKey, trialHarvestSummary, type TrialActivity } from "@/lib/trial-activity";
import { BovedaSessionContext } from "@/hooks/use-boveda-session";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
const PortfolioPanel = lazy(() => import("@/components/portfolio-panel").then((module) => ({ default: module.PortfolioPanel })));

const fmt = (n: number, d = 2) => n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const PrivyAccess = lazy(() => import("@/components/privy-access"));

function AccessLoading() {
  return <div className="grid min-h-screen place-items-center bg-background text-foreground"><p role="status" className="font-display">BÓVEDA · Conectando acceso…</p></div>;
}

export function AppExperience({ guest = false, view = "vaults" }: { guest?: boolean; view?: "vaults" | "portfolio" | "activity" | "account" }) {
  return <ClientOnly fallback={<AccessLoading />}><Suspense fallback={<AccessLoading />}>{guest ? <BovedaSessionContext.Provider value={{ ready: true, authenticated: false, userId: null, label: "Invitado", walletAddress: null, error: null, login: () => {}, logout: async () => {}, signAndSend: async () => { throw new Error("Invitado solo puede usar Prueba"); } }}><SessionPage guest view={view} /></BovedaSessionContext.Provider> : <PrivyAccess><SessionPage view={view} /></PrivyAccess>}</Suspense></ClientOnly>;
}
function SessionPage({ guest = false, view }: { guest?: boolean; view: "vaults" | "portfolio" | "activity" | "account" }) {
  const session = useBovedaSession();
  const [mode, setMode] = useState<AppMode>("real");
  const [modeReady, setModeReady] = useState(false);
  useEffect(() => { try { if (sessionStorage.getItem("boveda-mode") === "trial") setMode("trial"); } catch {} setModeReady(true); }, []);
  if (!guest && (!session.ready || !modeReady)) return <AccessLoading />;
  if (!guest && !session.authenticated) return <div className="mx-auto max-w-md px-5 py-12"><h1 className="font-display text-3xl">Entra a BÓVEDA</h1><p className="mt-3 text-muted-foreground">Inicia sesión o prueba como invitado, sin usar dinero.</p><Button asChild className="mt-6"><Link to="/">Ir al acceso</Link></Button><Button asChild variant="outline" className="ml-2 mt-6"><Link to="/prueba">Probar sin cuenta</Link></Button></div>;
  return <Dashboard key={`${session.userId ?? "guest"}:${guest ? "trial" : mode}`} mode={guest ? "trial" : mode} guest={guest} view={view} onModeChange={(value) => { if (guest) return; setMode(value); try { sessionStorage.setItem("boveda-mode", value); } catch {} }} />;
}

function Dashboard({ mode, onModeChange, guest, view }: { mode: AppMode; onModeChange: (mode: AppMode) => void; guest: boolean; view: "vaults" | "portfolio" | "activity" | "account" }) {
  const session = useBovedaSession();
  const navigate = useNavigate();
  const user = guest ? "Invitado" : session.authenticated && session.userId ? session.label : null;
  const identity = guest ? "guest" : session.userId;
  const storageKey = guest ? guestDemoKey : identity ? demoSessionKey(identity) : "";
  const trialAllowed = canUseTrial(mode, session.authenticated, session.userId, guest);
  const [activities, setActivities] = useState<TrialActivity[]>([]);
  const [guestView, setGuestView] = useState<"vaults" | "portfolio" | "activity">("vaults");
  const activeView = guest ? guestView : view;
  const [wallet, setWallet] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(0);
  const [depositFor, setDepositFor] = useState<Vault | null>(null);
  const [detailsFor, setDetailsFor] = useState<Vault | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [review, setReview] = useState<{ kind: "harvest" | "exit"; position: Position; amount: number } | null>(null);

  useEffect(() => {
    if (trialAllowed && identity) {
      let raw: string | null = null;
      try { raw = localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
      const data = readDemoSession(raw);
      setWallet(data.wallet); setPositions(data.positions);
      try { setActivities(readTrialActivity(localStorage.getItem(trialActivityKey(identity)))); } catch {}
    }
    setLoaded(true);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [mode, session.authenticated, session.userId]);
  useEffect(() => {
    if (!loaded || !identity || !trialAllowed) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ wallet, positions })); localStorage.setItem(trialActivityKey(identity), JSON.stringify(activities)); } catch { /* Continue without persistence. */ }
  }, [loaded, mode, session.authenticated, session.userId, wallet, positions, activities]);

  const record = (kind: TrialActivity["kind"], vaultId: string, values: ReturnType<typeof transactionAmounts>) => setActivities((previous) => [{ id: crypto.randomUUID(), kind, vaultId, ...values, at: Date.now() }, ...previous].slice(0, 200));
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };
  const vault = (id: string) => VAULTS.find((v) => v.id === id);
  const invested = positions.reduce((s, p) => s + p.principal, 0);
  const earned = positions.reduce((s, p) => s + accrued(p, vault(p.vaultId)?.apy ?? 0, now), 0);
  const harvestSummary = trialHarvestSummary(activities);

  const confirmWithdrawal = () => {
    if (!trialAllowed || !review || !positions.some((p) => p.id === review.position.id)) return;
    const values = transactionAmounts(review.amount);
    if (values.gross <= 0) return;
    if (review.kind === "harvest") {
      setPositions((ps) => ps.map((x) => x.id === review.position.id ? { ...x, claimed: x.claimed + values.gross } : x));
    } else {
      setPositions((ps) => ps.filter((x) => x.id !== review.position.id));
    }
    record(review.kind, review.position.vaultId, values);
    setWallet((w) => w + values.net);
    setReview(null);
    notify(`${review.kind === "harvest" ? "Cosecha" : "Liquidación"} de Prueba: ${fmt(values.net, 6)} créditos netos · cargo ficticio ${fmt(values.fee, 6)}`);
  };
  const deposit = (v: Vault, amt: number) => {
    if (!trialAllowed || !user || !Number.isFinite(amt) || !validDeposit(String(amt), wallet)) return;
    const values = transactionAmounts(amt, "deposit");
    record("deposit", v.id, values);
    setPositions((ps) => [...ps, { id: crypto.randomUUID(), vaultId: v.id, principal: values.net, openedAt: Date.now(), claimed: 0 }]);
    setWallet((w) => w - values.gross); setDepositFor(null); notify(`Depósito de Prueba: ${fmt(values.net, 6)} créditos invertidos · cargo ficticio ${fmt(values.fee, 6)}`);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5">
        <Link to="/" aria-label="BÓVEDA · Ir al inicio" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><VaultIcon size={18} /></span>
          BÓVEDA
        </Link>
        {user && !guest && (
          <Button variant="secondary" onClick={() => void (async () => { await session.logout(); await navigate({ to: "/", replace: true }); })()} className="min-w-0 max-w-[65%]" aria-label="Cerrar sesión">
            <Wallet size={14} /><span className="truncate">{user}</span><span className="shrink-0">· Cerrar sesión</span><LogOut size={14} />
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/"><Home size={16} />Volver al inicio</Link></Button>
        {session.error && <p role="alert" className="mb-4 text-sm text-destructive">{session.error}</p>}
        {guest ? <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-y border-border py-4"><p className="text-sm"><strong>Invitado · Prueba</strong> · Sin dinero real</p><Button asChild variant="outline" size="sm"><Link to="/">Crear cuenta o entrar</Link></Button></div> : <ModeSelector mode={mode} onChange={onModeChange} />}
        <nav aria-label="Secciones de BÓVEDA" className="mb-6 flex flex-wrap gap-2 border-b border-border pb-4">{guest ? <>{[["vaults", "Bóvedas"], ["portfolio", "Portafolio"], ["activity", "Actividad"]].map(([key, label]) => <Button key={key} variant={activeView === key ? "secondary" : "ghost"} onClick={() => setGuestView(key as "vaults" | "portfolio" | "activity")}>{label}</Button>)}<Button asChild variant="ghost"><Link to="/cuenta"><UserRound size={16} />Mi cuenta</Link></Button><Button asChild variant="ghost"><Link to="/faq">FAQ</Link></Button></> : <><Button asChild variant={view === "vaults" ? "secondary" : "ghost"}><Link to="/app"><LayoutDashboard size={16} />Bóvedas</Link></Button><Button asChild variant={view === "portfolio" ? "secondary" : "ghost"}><Link to="/portfolio"><PieChart size={16} />Portafolio</Link></Button><Button asChild variant={view === "activity" ? "secondary" : "ghost"}><Link to="/actividad"><History size={16} />Actividad</Link></Button><Button asChild variant={view === "account" ? "secondary" : "ghost"}><Link to="/cuenta"><UserRound size={16} />Mi cuenta</Link></Button></>}</nav>
        {activeView === "account" && !guest ? <AccountSettings /> : activeView === "activity" ? <ActivityView trial={mode === "trial"} wallet={session.walletAddress} rows={activities} /> : mode === "real" && !guest ? <RealOverview portfolioOnly={activeView === "portfolio"} walletAddress={session.walletAddress} onDetails={setDetailsFor} /> : user ? (
          <>
            <section aria-label="Estado del modo Prueba" className="border-y border-border py-8">
              <div className="flex items-center gap-3"><ShieldAlert className="shrink-0 text-primary" size={24} /><h1 className="font-display text-2xl font-semibold">{activeView === "portfolio" ? "Tu portafolio · Prueba" : "BÓVEDA · Prueba"}</h1></div>
              <p role="status" className="mt-4 font-semibold">Créditos ficticios · sin dinero real</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">0% de entrada y 1% ficticio de salida, en cosechas y liquidaciones. Un crédito simula un USDC; no se puede retirar ni convertir en dinero.</p>
              {session.walletAddress && <p className="mt-4 break-all text-xs text-muted-foreground">Wallet conectada: {session.walletAddress}</p>}
              <dl className="mt-6 grid gap-5 sm:grid-cols-3">
                <div><dt className="text-sm text-muted-foreground">Balance total · ficticio</dt><dd className="mt-1 break-all font-display text-xl">{fmt(wallet + invested + earned)} créditos</dd></div>
                <div><dt className="text-sm text-muted-foreground">Disponible</dt><dd className="mt-1 break-all font-display text-xl">{fmt(wallet)} créditos</dd></div>
                <div><dt className="text-sm text-muted-foreground">Posiciones en estos pools</dt><dd className="mt-1 font-display text-xl">{positions.length}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Ganancias pendientes</dt><dd className="mt-1 break-all font-display text-xl text-primary">+{fmt(earned, 4)}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Ganancias cosechadas · netas</dt><dd className="mt-1 break-all font-display text-xl text-primary">{fmt(harvestSummary.harvested, 6)}</dd></div>
                <div><dt className="text-sm text-muted-foreground">Porcentaje cosechado</dt><dd className="mt-1 font-display text-xl text-primary">{harvestSummary.percent === null ? "—" : harvestSummary.percent > 0 && harvestSummary.percent < 0.0001 ? "<0.0001%" : `${fmt(harvestSummary.percent, 4)}%`}</dd></div>
              </dl>
              <p className="mt-5 text-xs leading-5 text-muted-foreground">Cosechado después del cargo ficticio del 1%, sobre los depósitos del historial de Prueba de este navegador; no es una tasa anual. Las posiciones de Prueba no aparecen en Real.</p>
            </section>
            {positions.length > 0 && <section aria-label="Posiciones de Prueba" className="border-b border-border py-8"><h2 className="font-display text-lg font-semibold">Mis posiciones · Prueba</h2><div className="mt-4 space-y-4">{positions.map((p) => { const v = vault(p.vaultId); if (!v) return null; const a = accrued(p, v.apy, now); return <article key={p.id} className="rounded-lg border border-border bg-card p-5"><h3 className="font-display font-semibold">{v.name}</h3><p className="mt-1 text-xs text-muted-foreground">{v.pair}</p><p className="mt-3 break-all text-sm">Capital: {fmt(p.principal)} créditos</p><p className="mt-2 break-all text-sm text-muted-foreground">Ganancias acumuladas: <span className="text-primary">+{fmt(a, 6)} créditos</span></p><div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" disabled={transactionAmounts(a).gross <= 0} onClick={() => setReview({ kind: "harvest", position: p, amount: a })}><Sprout size={16} />Cosechar Ganancias</Button><Button variant="outline" onClick={() => setReview({ kind: "exit", position: p, amount: p.principal + a })}><ArrowDownToLine size={16} />Cerrar y Liquidar</Button></div></article>; })}</div></section>}
            {activeView === "portfolio" && identity && loaded && <div className="py-8"><Suspense fallback={<p role="status">Cargando portafolio…</p>}><PortfolioPanel identity={identity} wallet={wallet} invested={invested} pending={earned} positions={positions} rows={activities} now={now} /></Suspense></div>}
            {activeView === "vaults" && positions.length === 0 && <p className="border-b border-border py-8 text-muted-foreground">Aún no tienes posiciones. Elige una bóveda abajo para empezar.</p>}
            {activeView === "vaults" && <><h2 className="mb-4 mt-10 font-display text-lg font-semibold">Bóvedas disponibles · Prueba</h2>
            <div className="grid gap-4 md:grid-cols-3">{VAULTS.map((v) => <article key={v.id} className="flex flex-col rounded-lg border border-border bg-card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Pool de liquidez</span><span>Riesgo {v.risk}</span></div><h3 className="mt-4 font-display text-xl font-semibold">{v.name}</h3><p className="mt-1 text-sm text-muted-foreground">{v.pair}</p>
              <p className="mt-5 font-display text-4xl font-bold text-primary">{v.apy}%<span className="ml-1 text-sm font-normal text-muted-foreground">APY ilustrativo</span></p>
              <p className="mt-2 text-xs text-muted-foreground">Ejemplo de simulación · no es una tasa verificada del pool.</p>
              <p className="mt-5 flex-1 text-sm leading-6 text-muted-foreground">{v.blurb}</p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => setDetailsFor(v)}>Detalles del pool</Button>
              <Button variant="secondary" className="mt-2 w-full" onClick={() => setDepositFor(v)}>Depositar créditos</Button>
            </article>)}</div></>}
          </>
        ) : null}

      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-8 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">© {new Date().getFullYear()} Boveda Technologies LLC</p>
          <p className="mt-2">BÓVEDA es una interfaz concebida como no custodia para pools de liquidez, con modos Real y Prueba independientes. El acceso utiliza Privy con email, Google, Phantom o Jupiter Wallet, según disponibilidad. Prueba utiliza 1,000 créditos iniciales sin valor monetario. Real tiene un piloto de depósitos entre 1 y 10,000 USDC en SOL/MET; las cosechas y liquidaciones firmadas están limitadas a la posición SOL autorizada. El resto sigue en simulación. Los invitados solo pueden usar Prueba.</p>
          <p className="mt-3">Las estadísticas públicas provienen de DexScreener. Los APY y ganancias de Prueba son ilustrativos; no representan rendimientos reales ni garantizados. Proveer liquidez implica volatilidad, pérdida impermanente, fallos de contratos y posible pérdida total del capital. SPCX no implica afiliación con SpaceX ni acciones directas. Nada aquí constituye asesoría financiera, legal o fiscal. Boveda Technologies LLC no solicita claves privadas ni frases semilla.</p>
          <p className="mt-3">Comisión operativa: 0% de entrada y 1% de salida, en cosechas y liquidaciones. En la liquidación SOL del piloto, el 1% se calcula sobre el mínimo bruto USDC protegido por slippage, excluyendo la renta SOL. Los costes de red y conversión son independientes. En Prueba el cargo es ficticio.</p>
          <nav className="mt-4 flex flex-wrap gap-5 text-primary"><Link to="/faq">Preguntas frecuentes</Link><Link to="/terminos">Términos y condiciones</Link><Link to="/privacidad">Política de privacidad</Link></nav>
        </div>
      </footer>

      {mode === "trial" && depositFor && <DepositSheet vault={depositFor} max={wallet} onClose={() => setDepositFor(null)} onConfirm={deposit} />}
      {detailsFor && <PoolDetails key={detailsFor.id} vault={detailsFor} onClose={() => setDetailsFor(null)} />}
      {mode === "trial" && review && <WithdrawalReview key={`${review.kind}-${review.position.id}`} kind={review.kind} amount={review.amount} onClose={() => setReview(null)} onConfirm={confirmWithdrawal} />}
      {toast && <div role="status" className="fixed bottom-6 left-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg">{toast}</div>}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-muted-foreground">{label}</p><p className={`mt-1 font-display text-lg font-semibold ${accent ? "text-primary" : ""}`}>{value}</p></div>;
}

function DepositSheet({ vault, max, onClose, onConfirm }: { vault: Vault; max: number; onClose: () => void; onConfirm: (v: Vault, a: number) => void }) {
  const [amt, setAmt] = useState("");
  const [accepted, setAccepted] = useState(false);
  const n = Number(amt);
  const ok = validDeposit(amt, max);
  const preview = Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER / 1_000_000 ? n : 0;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg bg-card">
        <DialogTitle className="pr-4 font-display text-xl">Prueba · Depositar en {vault.name}</DialogTitle>
        <DialogDescription>Depósito con créditos ficticios y comisión de entrada del 0%. No mueve dinero.</DialogDescription>
        <p className="mt-1 text-sm text-muted-foreground">Disponible: {fmt(max)} créditos</p>
        <div className="mt-6 flex items-center rounded-2xl bg-background px-5 py-4">
          <input aria-label="Importe del depósito" autoFocus inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="min-w-0 w-full bg-transparent font-display text-4xl font-bold outline-none" />
          <Button variant="ghost" size="sm" onClick={() => setAmt(String(transactionAmounts(max).gross))}>MÁX</Button>
        </div>
        <FeeBreakdown amount={preview} deposit />
        <p className="text-xs text-muted-foreground">Ganancia ilustrativa anual antes de cargos de salida: {fmt(transactionAmounts(preview, "deposit").net * vault.apy / 100)} créditos</p>
        <AcceptTerms accepted={accepted} onChange={setAccepted} deposit />
        <Button disabled={!ok || !accepted} onClick={() => onConfirm(vault, n)} className="mt-2 w-full">Confirmar depósito de Prueba</Button>
    </DialogContent></Dialog>
  );
}

function AcceptTerms({ accepted, onChange, deposit = false }: { accepted: boolean; onChange: (value: boolean) => void; deposit?: boolean }) {
  return <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={accepted} onChange={(e) => onChange(e.target.checked)} className="mt-1" /><span>Acepto {deposit ? "la entrada sin comisión, la salida al 1%" : "el cargo de salida del 1%"} y los <Link to="/terminos" className="text-primary underline">términos y condiciones</Link>.</span></label>;
}

function WithdrawalReview({ kind, amount, onClose, onConfirm }: { kind: "harvest" | "exit"; amount: number; onClose: () => void; onConfirm: () => void }) {
  const [accepted, setAccepted] = useState(false);
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg bg-card">
    <DialogTitle>Prueba · {kind === "harvest" ? "Cosechar ganancias" : "Cerrar y liquidar"}</DialogTitle>
    <DialogDescription>{kind === "harvest" ? "El principal ficticio permanece invertido. El cargo simulado se descuenta solo de las ganancias cosechadas." : "Se cerrará la posición ficticia. El cargo simulado se descuenta del principal y las ganancias sin cosechar."}</DialogDescription>
    <FeeBreakdown amount={amount} /><AcceptTerms accepted={accepted} onChange={setAccepted} />
    <Button disabled={!accepted} onClick={onConfirm}>{kind === "harvest" ? "Confirmar cosecha" : "Confirmar liquidación"}</Button>
  </DialogContent></Dialog>;
}
