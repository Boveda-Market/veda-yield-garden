import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { TapAmount } from "@/components/ui/tap-amount";
import { MoveSteps } from "@/components/move-steps";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { simulationDisplay } from "@/lib/deposit-simulation";
import type { Vault } from "@/lib/vaults";
import { PilotDeposit } from "@/components/pilot-deposit";
import { clearResumeDeposit } from "@/lib/resume-deposit";
import { BuyUsdc } from "@/components/buy-usdc";
import { RangeAlertsGate } from "@/components/range-alerts-gate";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits } from "@/lib/onboarding";
import { poolYieldOptions } from "@/lib/pool-yield";
import { Wallet } from "lucide-react";
import { HotBanner } from "@/components/hot-vault-card";
import { vaultSkin } from "@/components/vault-skin";
import { isDlmmVault } from "@/lib/solana-data";

const MAX_MICRO = 5_000_000_000n;
const microToText = (v: bigint) => { const w = v / 1_000_000n; const f = (v % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, ""); return f ? `${w}.${f}` : `${w}`; };

export function DepositSimulation({ vault, wallet, onClose, initialAmount = "", position, migrate = false }: { vault: Vault; wallet: string | null; onClose: () => void; initialAmount?: string; position?: string; migrate?: boolean }) {
  const t = useT();
  const [amount, setAmount] = useState(initialAmount);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { if (done) clearResumeDeposit(); }, [done]);
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
  const typed = decimalToUnits(amount || "0", 6);
  const overBalance = usdc != null && typed != null && typed > usdc;
  const pick = (pct: bigint) => { if (usdc == null) return; const cap = usdc < MAX_MICRO ? usdc : MAX_MICRO; setAmount(microToText((cap * pct) / 100n)); };
  const clean = (v: string) => { const s = v.replace(/,/g, ".").replace(/[^\d.]/g, ""); const [w, ...rest] = s.split("."); return rest.length ? `${w}.${rest.join("").slice(0, 6)}` : (w ?? ""); };

  const hot = Boolean(vault.badge) && !migrate;
  const showBanner = hot && !done;
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><ActionSheetContent closeLabel={t("Cerrar")} className={hot ? `border-hot/40 shadow-[var(--shadow-hot)] ${vaultSkin(vault.id)}` : undefined}>
    {showBanner && <HotBanner vault={vault} className="-mx-5 -mt-2 rounded-t-3xl pr-14 sm:-mx-6 sm:-mt-6">
      <span className="rounded-full bg-hot-surface px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide">⚡ {t("Sé la casa")}</span>
      <span className="flex items-center gap-1 rounded-full bg-hot-surface/70 px-2 py-0.5 text-[10px] font-bold uppercase"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live shadow-[0_0_6px_var(--live)] motion-reduce:animate-none" />{t("En vivo")}</span>
    </HotBanner>}
    <DialogTitle className={done || showBanner ? "sr-only" : undefined}>{migrate ? t("Cambiar a {v}", { v: t(vault.name) }) : <>{position ? t("Depositar más ·") : t("Depositar ·")}{" "}{t(vault.name)}</>}</DialogTitle>
    <DialogDescription className={done ? "sr-only" : undefined}>{migrate ? t("Depositamos en la nueva bóveda lo que moviste.") : t("Elige cuánto quieres depositar y confirma.")}</DialogDescription>
    {migrate && !done && <MoveSteps current={2} to={t(vault.name)} />}
    {migrate && !done && <p className="text-center font-display text-3xl font-bold tabular-nums">${amount || "—"}</p>}
    {!done && !migrate && <>
    <div className={hot ? "flex items-center justify-between rounded-xl border border-hot/30 bg-hot-surface p-3 text-sm text-hot-foreground" : "flex items-center justify-between rounded-xl bg-muted p-3 text-sm"}>
      <span className={hot ? "text-xs font-semibold uppercase tracking-wide text-hot-muted" : "text-muted-foreground"}>{t("Intereses estimados")}</span>
      <span className="font-display text-lg font-bold text-primary">{apr == null ? "—" : `${apr.toFixed(2)}% APR`}</span>
    </div>
    <div className="grid gap-2 rounded-xl border border-border p-4">
      <button type="button" disabled={busy || !usdc} onClick={() => pick(100n)} className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-left disabled:cursor-default"><span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Wallet size={14} className="text-primary" />{t("Disponible para depositar")}</span><span className="font-display text-lg font-bold tabular-nums text-foreground">{usdc == null ? "…" : microToText(usdc)} <span className="text-xs font-semibold text-muted-foreground">$</span></span></button>
      <span className="text-xs text-muted-foreground">{t("Cantidad ($)")}</span>
      <TapAmount label={t("Cantidad ($)")} prefix="$" value={amount} disabled={busy} onChange={(v) => setAmount(clean(v))} />
      <div className="grid grid-cols-4 gap-2">{([25n, 50n, 75n, 100n] as const).map((p) => <Button key={p.toString()} type="button" size="sm" variant="secondary" disabled={busy || !usdc} onClick={() => pick(p)}>{p === 100n ? t("Máx") : `${p}%`}</Button>)}</div>
      <p className="text-xs text-muted-foreground">{migrate ? t("Traslado entre bóvedas: el detalle aparece antes de confirmar.") : t("Entre $1 y $5,000.")}</p>
      {overBalance && <p role="alert" className="text-xs text-muted-foreground">{t("No tienes suficientes dólares para esta cantidad.")}</p>}
      {(overBalance || usdc === 0n) && <div className={hot ? "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-hot/40 bg-hot/10 p-3 text-xs" : "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs"}><span>{hot ? t("Estás a un paso de comenzar. Deposita dólares para entrar a la {v}.", { v: t(vault.name) }) : t("Estás a un paso de comenzar. Añade dólares y sigue aquí mismo.")}</span><BuyUsdc className="w-full" hot={hot} resume={{ vaultId: vault.id, amount: typed != null ? amount : "", ...(position ? { position } : {}), ...(migrate ? { migrate: true } : {}) }} needMicro={overBalance && typed != null && usdc != null ? typed - usdc : undefined} /></div>}
    </div>
    {breakdown && <dl className="grid gap-2 rounded-xl bg-muted p-4 text-sm">
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Importe")}</dt><dd>${breakdown.gross}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Invertido neto")}</dt><dd className="font-semibold">${breakdown.net}</dd></div>
    </dl>}
    {!position && !migrate && <p role="note" className="rounded-xl border border-border p-3 text-xs leading-5 text-muted-foreground">{t("Tu capital se combina con la otra moneda de la bóveda y su valor fluctuará con el precio de mercado, mientras acumulas intereses en cada operación.")} <a href="/faq#vaults-fluctuation" className="underline">{t("¿Por qué cambia mi balance?")}</a></p>}
    </>}
    {!done && !migrate && isDlmmVault(vault.id) && <RangeAlertsGate />}
    {wallet ? <PilotDeposit usdc={usdc} autoStart={migrate} vaultId={vault.id} amount={amount} position={position} migrate={migrate} onBusyChange={setBusy} onClose={onClose} onDoneChange={setDone} /> : <p role="note" className="text-sm text-muted-foreground">{t("Conecta tu wallet para depositar.")}</p>}
  </ActionSheetContent></Dialog>;
}
