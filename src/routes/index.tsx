import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowDownToLine, LogOut, Sprout, Vault as VaultIcon, Wallet } from "lucide-react";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { demoSessionKey, readDemoSession } from "@/lib/demo-session";
import { VAULTS, accrued, type Position, type Vault } from "@/lib/vaults";
import { Button } from "@/components/ui/button";
import { PoolDetails } from "@/components/pool-details";
import { transactionAmounts, validDeposit } from "@/lib/fees";
import { FeeBreakdown } from "@/components/fee-breakdown";
import { EmailSignup } from "@/components/email-signup";
import { Faq } from "@/components/faq";
import { ModeSelector } from "@/components/mode-selector";
import { RealOverview } from "@/components/real-overview";
import { canRunTrial, type AppMode } from "@/lib/app-mode";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BÓVEDA — Solana · Real y Prueba" },
      { name: "description", content: "Explora pools Meteora con BÓVEDA y prueba con 1,000 créditos ficticios. Modos Real y Prueba separados; operaciones reales aún no habilitadas." },
      { property: "og:title", content: "BÓVEDA — Solana · Real y Prueba" },
      { property: "og:description", content: "Pools de Solana, acceso con Privy, Phantom o Jupiter Wallet y Prueba con 1,000 créditos. Consulta la disponibilidad del modo Real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const fmt = (n: number, d = 2) => n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const PrivyAccess = lazy(() => import("@/components/privy-access"));

function AccessLoading() {
  return <div className="grid min-h-screen place-items-center bg-background text-foreground"><p role="status" className="font-display">BÓVEDA · Conectando acceso…</p></div>;
}

function Index() {
  return <ClientOnly fallback={<AccessLoading />}><Suspense fallback={<AccessLoading />}><PrivyAccess><SessionPage /></PrivyAccess></Suspense></ClientOnly>;
}

function SessionPage() {
  const { userId } = useBovedaSession();
  const [mode, setMode] = useState<AppMode>("real");
  return <Dashboard key={`${userId ?? "signed-out"}:${mode}`} mode={mode} onModeChange={setMode} />;
}

function Dashboard({ mode, onModeChange }: { mode: AppMode; onModeChange: (mode: AppMode) => void }) {
  const session = useBovedaSession();
  const user = session.authenticated && session.userId ? session.label : null;
  const [wallet, setWallet] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(0);
  const [depositFor, setDepositFor] = useState<Vault | null>(null);
  const [detailsFor, setDetailsFor] = useState<Vault | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [review, setReview] = useState<{ kind: "harvest" | "exit"; position: Position; amount: number } | null>(null);

  useEffect(() => {
    if (canRunTrial(mode, session.authenticated, session.userId) && session.userId) {
      let raw: string | null = null;
      try { raw = localStorage.getItem(demoSessionKey(session.userId)); } catch { /* Storage may be disabled. */ }
      const data = readDemoSession(raw);
      setWallet(data.wallet); setPositions(data.positions);
    }
    setLoaded(true);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [mode, session.authenticated, session.userId]);
  useEffect(() => {
    if (!loaded || !session.userId || !canRunTrial(mode, session.authenticated, session.userId)) return;
    try { localStorage.setItem(demoSessionKey(session.userId), JSON.stringify({ wallet, positions })); } catch { /* Continue without persistence. */ }
  }, [loaded, mode, session.authenticated, session.userId, wallet, positions]);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };
  const vault = (id: string) => VAULTS.find((v) => v.id === id);
  const invested = positions.reduce((s, p) => s + p.principal, 0);
  const earned = positions.reduce((s, p) => s + accrued(p, vault(p.vaultId)?.apy ?? 0, now), 0);
  const yearly = positions.reduce((s, p) => s + p.principal * (vault(p.vaultId)?.apy ?? 0) / 100, 0);

  const confirmWithdrawal = () => {
    if (!canRunTrial(mode, session.authenticated, session.userId) || !review || !positions.some((p) => p.id === review.position.id)) return;
    const values = transactionAmounts(review.amount);
    if (values.gross <= 0) return;
    if (review.kind === "harvest") {
      setPositions((ps) => ps.map((x) => x.id === review.position.id ? { ...x, claimed: x.claimed + values.gross } : x));
    } else {
      setPositions((ps) => ps.filter((x) => x.id !== review.position.id));
    }
    setWallet((w) => w + values.net);
    setReview(null);
    notify(`${review.kind === "harvest" ? "Cosecha" : "Liquidación"} de Prueba: ${fmt(values.net, 6)} créditos netos · cargo ficticio ${fmt(values.fee, 6)}`);
  };
  const deposit = (v: Vault, amt: number) => {
    if (!canRunTrial(mode, session.authenticated, session.userId) || !user || !Number.isFinite(amt) || !validDeposit(String(amt), wallet)) return;
    const values = transactionAmounts(amt);
    setPositions((ps) => [...ps, { id: crypto.randomUUID(), vaultId: v.id, principal: values.net, openedAt: Date.now(), claimed: 0 }]);
    setWallet((w) => w - values.gross); setDepositFor(null); notify(`Depósito de Prueba: ${fmt(values.net, 6)} créditos invertidos · cargo ficticio ${fmt(values.fee, 6)}`);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><VaultIcon size={18} /></span>
          BÓVEDA
        </div>
        {user && (
          <Button variant="secondary" onClick={() => void session.logout()} className="min-w-0 max-w-[65%]" aria-label="Cerrar sesión">
            <Wallet size={14} /><span className="truncate">{user}</span><LogOut size={14} />
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        {session.error && <p role="alert" className="mb-4 text-sm text-destructive">{session.error}</p>}
        <ModeSelector mode={mode} onChange={onModeChange} />
        {!user && <Login mode={mode} />}
        {mode === "real" ? <RealOverview walletAddress={session.walletAddress} onDetails={setDetailsFor} /> : user ? (
          <>
            <p className="mb-4 text-xs leading-5 text-muted-foreground">Prueba · créditos sin valor monetario · 1% ficticio por depósito, cosecha y liquidación. Un crédito simula un USDC; no se puede retirar ni convertir en dinero.</p>
            {session.walletAddress && <p className="mb-4 break-all text-xs text-muted-foreground">Wallet Solana conectada: {session.walletAddress}</p>}
            <section className="rounded-3xl p-7 md:p-10" style={{ background: "var(--gradient-hero)" }}>
              <p className="text-sm text-muted-foreground">Balance de Prueba · ficticio</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-2 font-display text-5xl font-bold md:text-6xl">{fmt(wallet + invested + earned)} <span className="text-2xl text-muted-foreground">créditos</span></p>
              <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
                <Stat label="Disponible" value={fmt(wallet)} />
                <Stat label="Ganancias acumuladas" value={`+${fmt(earned, 4)}`} accent />
                <Stat label="Ganancia anual ilustrativa" value={`${fmt(yearly)}`} />
              </div>
            </section>

            <h2 className="mt-12 mb-4 font-display text-lg font-semibold">Mis posiciones · {positions.length} activas</h2>
            {positions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">Aún no tienes posiciones. Elige una bóveda abajo para empezar.</p>
            ) : (
              <div className="space-y-3">
                {positions.map((p) => {
                  const v = vault(p.vaultId);
                  if (!v) return null;
                  const a = accrued(p, v.apy, now);
                  return (
                    <div key={p.id} className="flex flex-col gap-4 rounded-2xl bg-card p-5 md:flex-row md:items-center">
                      <div className="flex-1">
                        <p className="font-display font-semibold">{v.name} <span className="ml-2 text-xs text-muted-foreground">{v.pair}</span></p>
                        <p className="text-sm text-muted-foreground">Capital {fmt(p.principal)} créditos · <span className="text-primary">+{fmt(a, 6)} créditos</span></p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={transactionAmounts(a).gross <= 0} onClick={() => setReview({ kind: "harvest", position: p, amount: a })} variant="secondary"><Sprout size={16} /> Cosechar Ganancias</Button>
                        <Button onClick={() => setReview({ kind: "exit", position: p, amount: p.principal + a })} variant="secondary"><ArrowDownToLine size={16} /> Cerrar y Liquidar</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <h2 className="mt-12 mb-4 font-display text-lg font-semibold">Catálogo de bóvedas</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {VAULTS.map((v) => (
                <div key={v.id} className="flex flex-col rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Meteora DAMM v2</span><span>Riesgo {v.risk}</span></div>
                  <p className="mt-4 font-display text-xl font-semibold">{v.name}</p>
                  <p className="text-sm text-muted-foreground">{v.pair}</p>
                  <p className="mt-5 font-display text-4xl font-bold text-primary">{v.apy}%<span className="ml-1 text-sm font-normal text-muted-foreground">APY ilustrativo</span></p>
                  <p className="mt-2 text-xs text-muted-foreground">Ejemplo de simulación · no es una tasa verificada del pool.</p>
                  <p className="mt-3 flex-1 text-sm text-muted-foreground">{v.blurb}</p>
                   <Button variant="outline" className="mt-4 w-full" onClick={() => setDetailsFor(v)}>Detalles del pool</Button>
                  <Button onClick={() => setDepositFor(v)} className="mt-5 h-12">Depositar créditos</Button>
                </div>
              ))}
            </div>
          </>
        ) : null}
        <Faq preview />
        <EmailSignup />
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-8 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">© {new Date().getFullYear()} Boveda Technologies LLC</p>
          <p className="mt-2">BÓVEDA es una interfaz concebida como no custodia para pools Meteora en Solana, con modos Real y Prueba independientes. El acceso utiliza Privy con email, Google, Phantom o Jupiter Wallet, según disponibilidad. Prueba utiliza 1,000 créditos iniciales sin valor monetario. Real aún no permite depósitos, cosechas, liquidaciones ni transferencias de cargos. No envíes fondos para operar en esta versión.</p>
          <p className="mt-3">Las estadísticas públicas provienen de DexScreener. Los APY y ganancias de Prueba son ilustrativos; no representan rendimientos reales ni garantizados. Proveer liquidez implica volatilidad, pérdida impermanente, fallos de contratos y posible pérdida total del capital. SPCX no implica afiliación con SpaceX ni acciones directas. Nada aquí constituye asesoría financiera, legal o fiscal. Boveda Technologies LLC no solicita claves privadas ni frases semilla.</p>
          <p className="mt-3">Cargo operativo previsto para Real: 1% en USDC por depósito, cosecha y liquidación, descontado del importe bruto para operación y mantenimiento. Los costes de red y conversión son independientes. En Prueba el cargo es ficticio y no se transfiere a ninguna wallet.</p>
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

function Login({ mode }: { mode: AppMode }) {
  const { ready, login } = useBovedaSession();
  return (
    <section className="mx-auto mt-10 max-w-md rounded-3xl p-8" style={{ background: "var(--gradient-hero)" }}>
      <h1 className="font-display text-4xl font-bold leading-tight">BÓVEDA</h1>
      <p className="mt-3 text-muted-foreground">{mode === "trial" ? "Prueba las bóvedas con 1,000 créditos ficticios, sin mover dinero." : "Explora las bóvedas de Solana. Las operaciones del modo Real aún no están habilitadas."}</p>
      <div className="mt-8 space-y-3">
        <Button disabled={!ready} onClick={() => login("email")} className="h-12 w-full">Continuar con email</Button>
        <Button disabled={!ready} variant="secondary" onClick={() => login("google")} className="h-12 w-full">Continuar con Google</Button>
        <Button disabled={!ready} variant="outline" onClick={() => login("wallet")} className="h-12 w-full"><Wallet size={16} /> Phantom / Jupiter Wallet</Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Acceso con Privy · iniciar sesión no autoriza movimientos de fondos.</p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Consulta los <Link to="/terminos" className="text-primary underline">términos</Link> y la <Link to="/privacidad" className="text-primary underline">privacidad</Link> antes de acceder.</p>
    </section>
  );
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
        <DialogDescription>Depósito con créditos ficticios y cargo simulado del 1%. No mueve dinero.</DialogDescription>
        <p className="mt-1 text-sm text-muted-foreground">Disponible: {fmt(max)} créditos</p>
        <div className="mt-6 flex items-center rounded-2xl bg-background px-5 py-4">
          <input aria-label="Importe del depósito" autoFocus inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="min-w-0 w-full bg-transparent font-display text-4xl font-bold outline-none" />
          <Button variant="ghost" size="sm" onClick={() => setAmt(String(transactionAmounts(max).gross))}>MÁX</Button>
        </div>
        <FeeBreakdown amount={preview} deposit />
        <p className="text-xs text-muted-foreground">Ganancia ilustrativa anual antes de cargos de salida: {fmt(transactionAmounts(preview).net * vault.apy / 100)} créditos</p>
        <AcceptTerms accepted={accepted} onChange={setAccepted} />
        <Button disabled={!ok || !accepted} onClick={() => onConfirm(vault, n)} className="mt-2 w-full">Confirmar depósito de Prueba</Button>
    </DialogContent></Dialog>
  );
}

function AcceptTerms({ accepted, onChange }: { accepted: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-start gap-3 text-xs leading-5 text-muted-foreground"><input type="checkbox" checked={accepted} onChange={(e) => onChange(e.target.checked)} className="mt-1" /><span>Acepto el cargo del 1% y los <Link to="/terminos" className="text-primary underline">términos y condiciones</Link>.</span></label>;
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
