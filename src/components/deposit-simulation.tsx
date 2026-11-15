import { useT } from "@/lib/i18n";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoveSteps } from "@/components/move-steps";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { simulationDisplay } from "@/lib/deposit-simulation";
import type { Vault } from "@/lib/vaults";
import { PilotDeposit } from "@/components/pilot-deposit";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits, MIN_SOL_LAMPORTS } from "@/lib/onboarding";
import { poolYieldOptions } from "@/lib/pool-yield";
import { Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";

const MAX_MICRO = 10_000_000_000n;
const microToText = (v: bigint) => { const w = v / 1_000_000n; const f = (v % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, ""); return f ? `${w}.${f}` : `${w}`; };

export function DepositSimulation({ vault, wallet, onClose, initialAmount = "", position, migrate = false }: { vault: Vault; wallet: string | null; onClose: () => void; initialAmount?: string; position?: string; migrate?: boolean }) {
  const t = useT();
  const [amount, setAmount] = useState(initialAmount);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const readWallet = useServerFn(getRealWallet);
  const balances = useQuery({ queryKey: ["my-wallet", wallet], enabled: !!wallet, queryFn: async () => {
    const r = await readWallet({ data: { wallet: wallet! } });
    if (!r.success) throw new Error(r.error);
    return { sol: decimalToUnits(r.data.sol, 9) ?? 0n, usdc: decimalToUnits(r.data.usdc, 6) ?? 0n };
  } });
  const yieldQ = useQuery(poolYieldOptions(vault.pool));
  const apr = yieldQ.data?.apr;
  let breakdown: ReturnType<typeof simulationDisplay> | null = null;
  try { breakdown = simulationDisplay(amount, migrate); } catch { /* Incomplete input. */ }
  const usdc = balances.data?.usdc;
  const lowSol = balances.data ? balances.data.sol < MIN_SOL_LAMPORTS : false;
  const typed = decimalToUnits(amount || "0", 6);
  const overBalance = usdc != null && typed != null && typed > usdc;
  const pick = (pct: bigint) => { if (usdc == null) return; const cap = usdc < MAX_MICRO ? usdc : MAX_MICRO; setAmount(microToText((cap * pct) / 100n)); };
  const clean = (v: string) => { const s = v.replace(/,/g, ".").replace(/[^\d.]/g, ""); const [w, ...rest] = s.split("."); return rest.length ? `${w}.${rest.join("").slice(0, 6)}` : (w ?? ""); };

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><ActionSheetContent closeLabel={t("Cerrar")}>
    <DialogTitle className={done ? "sr-only" : undefined}>{migrate ? t("Migrar a {v}", { v: t(vault.name) }) : <>{position ? t("Depositar más ·") : t("Depositar ·")}{" "}{t(vault.name)}</>}</DialogTitle>
    <DialogDescription className={done ? "sr-only" : undefined}>{migrate ? t("Movemos todo tu dinero y ganancias.") : t("Elige cuánto quieres depositar y confirma.")}</DialogDescription>
    {migrate && !done && <MoveSteps current={2} to={t(vault.name)} />}
    {migrate && !done && <p className="text-center font-display text-3xl font-bold tabular-nums">${amount || "—"}</p>}
    {!done && !migrate && <>
    <div className="flex items-center justify-between rounded-xl bg-muted p-3 text-sm">
      <span className="text-muted-foreground">{t("Rendimiento estimado")}</span>
      <span className="font-display text-lg font-bold text-primary">{apr == null ? "—" : `${apr.toFixed(2)}% APR`}</span>
    </div>
    <div className="grid gap-2 rounded-xl border border-border p-4">
      <button type="button" disabled={busy || !usdc} onClick={() => pick(100n)} className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-left disabled:cursor-default"><span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Wallet size={14} className="text-primary" />{t("Disponible para depositar")}</span><span className="font-display text-lg font-bold tabular-nums text-foreground">{usdc == null ? "…" : microToText(usdc)} <span className="text-xs font-semibold text-muted-foreground">$</span></span></button>
      <span className="text-xs text-muted-foreground">{t("Cantidad ($)")}</span>
      <Input aria-label={t("Cantidad ($)")} inputMode="decimal" placeholder="0.00" value={amount} maxLength={12} disabled={busy} className="border-0 px-0 font-display text-3xl shadow-none focus-visible:ring-0" onChange={(e) => setAmount(clean(e.target.value))} />
      <div className="grid grid-cols-4 gap-2">{([25n, 50n, 75n, 100n] as const).map((p) => <Button key={p.toString()} type="button" size="sm" variant="secondary" disabled={busy || !usdc} onClick={() => pick(p)}>{p === 100n ? t("Máx") : `${p}%`}</Button>)}</div>
      <p className="text-xs text-muted-foreground">{migrate ? t("Traslado entre bóvedas: sin comisión de BÓVEDA.") : t("Entre $1 y $10,000. Depositar es sin comisión.")}</p>
      {overBalance && <p role="alert" className="text-xs text-destructive">{t("No tienes suficientes dólares para esta cantidad.")}</p>}
      {(overBalance || usdc === 0n) && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs"><span>{t("¿Necesitas fondos? Añádelos en Mi Billetera.")}</span><Button asChild size="sm" variant="outline"><Link to="/wallet">{t("Ir a Mi Billetera")} →</Link></Button></div>}
    </div>
    {lowSol && <div role="note" className="grid gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs leading-5">
      <p>{t("Recarga tu reserva de operaciones antes de depositar.")}</p>
      <Button asChild size="sm" variant="outline"><Link to="/wallet">{t("Ir a Mi Billetera")} →</Link></Button>
    </div>}
    {breakdown && <dl className="grid gap-2 rounded-xl bg-muted p-4 text-sm">
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Importe")}</dt><dd>${breakdown.gross}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Comisión de entrada")}</dt><dd className="font-semibold text-primary">$0.00</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Invertido neto")}</dt><dd className="font-semibold">${breakdown.net}</dd></div>
    </dl>}
    <p role="note" className="rounded-xl border border-border p-3 text-xs leading-5 text-muted-foreground">{t("Tu capital se combina con la otra moneda de la bóveda y su valor fluctuará con el precio de mercado, mientras acumulas comisiones en cada operación.")} <a href="/faq#vaults-fluctuation" className="underline">{t("¿Por qué cambia mi balance?")}</a></p>
    </>}
    {wallet ? <PilotDeposit autoStart={migrate} vaultId={vault.id} amount={amount} position={position} migrate={migrate} onBusyChange={setBusy} onClose={onClose} onDoneChange={setDone} /> : <p role="note" className="text-sm text-muted-foreground">{t("Conecta tu wallet para depositar.")}</p>}
  </ActionSheetContent></Dialog>;
}
