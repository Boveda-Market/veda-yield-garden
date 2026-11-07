import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownToLine, LogOut, Sprout, Vault as VaultIcon, Wallet, X } from "lucide-react";
import { VAULTS, accrued, type Position, type Vault } from "@/lib/vaults";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BÓVEDA — Rendimiento en USDC sobre Solana" },
      { name: "description", content: "Deposita USDC en bóvedas Meteora DAMM v2 y cosecha ganancias. Interfaz no custodia." },
      { property: "og:title", content: "BÓVEDA — Rendimiento en USDC" },
      { property: "og:description", content: "Bóvedas SOL, MET y RWA sobre Meteora DAMM v2 en Solana." },
    ],
  }),
  component: Index,
});

const fmt = (n: number, d = 2) => n.toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d });
const KEY = "boveda-state-v1";

function Index() {
  const [user, setUser] = useState<string | null>(null);
  const [wallet, setWallet] = useState(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [now, setNow] = useState(0);
  const [depositFor, setDepositFor] = useState<Vault | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const s = localStorage.getItem(KEY);
    if (s) { const d = JSON.parse(s); setUser(d.user); setWallet(d.wallet); setPositions(d.positions); }
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (now) localStorage.setItem(KEY, JSON.stringify({ user, wallet, positions })); }, [user, wallet, positions, now]);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2800); };
  const vault = (id: string) => VAULTS.find((v) => v.id === id)!;
  const invested = positions.reduce((s, p) => s + p.principal, 0);
  const earned = positions.reduce((s, p) => s + accrued(p, vault(p.vaultId).apy, now), 0);
  const yearly = positions.reduce((s, p) => s + p.principal * vault(p.vaultId).apy / 100, 0);

  const login = (method: string) => { setUser(method); if (!wallet && !positions.length) setWallet(1000); };
  const harvest = (p: Position) => {
    const a = accrued(p, vault(p.vaultId).apy, now);
    setPositions((ps) => ps.map((x) => x.id === p.id ? { ...x, claimed: x.claimed + a } : x));
    setWallet((w) => w + a); notify(`Cosechaste ${fmt(a, 4)} USDC`);
  };
  const exit = (p: Position) => {
    const total = p.principal + accrued(p, vault(p.vaultId).apy, now);
    setPositions((ps) => ps.filter((x) => x.id !== p.id));
    setWallet((w) => w + total); notify(`Posición liquidada: ${fmt(total)} USDC`);
  };
  const deposit = (v: Vault, amt: number) => {
    setPositions((ps) => [...ps, { id: crypto.randomUUID(), vaultId: v.id, principal: amt, openedAt: Date.now(), claimed: 0 }]);
    setWallet((w) => w - amt); setDepositFor(null); notify(`Depositaste ${fmt(amt)} USDC en ${v.name}`);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><VaultIcon size={18} /></span>
          BÓVEDA
        </div>
        {user && (
          <button onClick={() => setUser(null)} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            <Wallet size={14} /> {user} <LogOut size={14} />
          </button>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        {!user ? <Login onLogin={login} /> : (
          <>
            <section className="rounded-3xl p-7 md:p-10" style={{ background: "var(--gradient-hero)" }}>
              <p className="text-sm text-muted-foreground">Balance total</p>
              <p className="mt-1 font-display text-5xl font-bold tracking-tight md:text-6xl">{fmt(wallet + invested + earned)} <span className="text-2xl text-muted-foreground">USDC</span></p>
              <div className="mt-8 grid grid-cols-3 gap-4 text-sm">
                <Stat label="Disponible" value={fmt(wallet)} />
                <Stat label="Ganancias acumuladas" value={`+${fmt(earned, 4)}`} accent />
                <Stat label="Rendimiento est. anual" value={`${fmt(yearly)}`} />
              </div>
            </section>

            <h2 className="mt-12 mb-4 font-display text-lg font-semibold">Mis posiciones · {positions.length} activas</h2>
            {positions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">Aún no tienes posiciones. Elige una bóveda abajo para empezar.</p>
            ) : (
              <div className="space-y-3">
                {positions.map((p) => {
                  const v = vault(p.vaultId); const a = accrued(p, v.apy, now);
                  return (
                    <div key={p.id} className="flex flex-col gap-4 rounded-2xl bg-card p-5 md:flex-row md:items-center">
                      <div className="flex-1">
                        <p className="font-display font-semibold">{v.name} <span className="ml-2 text-xs text-muted-foreground">{v.pair}</span></p>
                        <p className="text-sm text-muted-foreground">Capital {fmt(p.principal)} USDC · <span className="text-primary">+{fmt(a, 6)} USDC</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => harvest(p)} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90"><Sprout size={16} /> Cosechar Ganancias</button>
                        <button onClick={() => exit(p)} className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold hover:bg-muted"><ArrowDownToLine size={16} /> Cerrar y Liquidar</button>
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
                  <p className="mt-5 font-display text-4xl font-bold text-primary">{v.apy}%<span className="ml-1 text-sm font-normal text-muted-foreground">APY est.</span></p>
                  <p className="mt-3 flex-1 text-sm text-muted-foreground">{v.blurb}</p>
                  <a href={`https://app.meteora.ag/dammv2/${v.pool}`} target="_blank" rel="noreferrer" className="mt-3 truncate font-mono text-xs text-muted-foreground underline-offset-2 hover:underline">{v.pool}</a>
                  <button onClick={() => setDepositFor(v)} className="mt-5 rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90">Depositar USDC</button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-8 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">© {new Date().getFullYear()} Boveda Technologies LLC</p>
          <p className="mt-2">Bóveda es una interfaz de software no custodia que facilita la interacción con contratos inteligentes desplegados en la red Solana y en los protocolos de Meteora. Boveda Technologies LLC no custodia, controla ni tiene acceso a los fondos de los usuarios; las claves privadas permanecen bajo control exclusivo del usuario. Los rendimientos mostrados son estimaciones, no están garantizados y pueden variar. Proveer liquidez implica riesgos, incluidos pérdida impermanente, volatilidad, fallos de contratos inteligentes y pérdida total del capital. Nada en esta interfaz constituye asesoría financiera, legal o fiscal.</p>
        </div>
      </footer>

      {depositFor && <DepositSheet vault={depositFor} max={wallet} onClose={() => setDepositFor(null)} onConfirm={deposit} />}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg">{toast}</div>}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-muted-foreground">{label}</p><p className={`mt-1 font-display text-lg font-semibold ${accent ? "text-primary" : ""}`}>{value}</p></div>;
}

function Login({ onLogin }: { onLogin: (m: string) => void }) {
  const [email, setEmail] = useState("");
  return (
    <section className="mx-auto mt-10 max-w-md rounded-3xl p-8" style={{ background: "var(--gradient-hero)" }}>
      <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">Tu dinero, trabajando en Solana.</h1>
      <p className="mt-3 text-muted-foreground">Deposita USDC en bóvedas de rendimiento. Sin custodia, sin complicaciones.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (email) onLogin(email); }} className="mt-8 space-y-3">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 outline-none focus:border-ring" />
        <button className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground">Continuar con email</button>
      </form>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        {["Google", "Phantom", "Solflare"].map((m) => (
          <button key={m} onClick={() => onLogin(m)} className="rounded-xl bg-secondary py-3 font-medium hover:bg-muted">{m}</button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Modo demostración: se acreditan 1,000 USDC de prueba.</p>
    </section>
  );
}

function DepositSheet({ vault, max, onClose, onConfirm }: { vault: Vault; max: number; onClose: () => void; onConfirm: (v: Vault, a: number) => void }) {
  const [amt, setAmt] = useState("");
  const n = Number(amt);
  const ok = n > 0 && n <= max;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-card p-7 md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><p className="font-display text-xl font-semibold">Depositar en {vault.name}</p><button onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
        <p className="mt-1 text-sm text-muted-foreground">Disponible: {fmt(max)} USDC</p>
        <div className="mt-6 flex items-center rounded-2xl bg-background px-5 py-4">
          <input autoFocus inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="w-full bg-transparent font-display text-4xl font-bold outline-none" />
          <button onClick={() => setAmt(String(max))} className="text-sm font-semibold text-primary">MÁX</button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Ganancia estimada anual: <span className="text-primary">{fmt((n || 0) * vault.apy / 100)} USDC</span></p>
        <button disabled={!ok} onClick={() => onConfirm(vault, n)} className="mt-6 w-full rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground disabled:opacity-40">Confirmar depósito</button>
      </div>
    </div>
  );
}
