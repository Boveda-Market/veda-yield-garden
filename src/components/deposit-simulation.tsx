import { useT } from "@/lib/i18n";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { simulationDisplay } from "@/lib/deposit-simulation";
import type { Vault } from "@/lib/vaults";
import { PilotDeposit } from "@/components/pilot-deposit";
import { getRealWallet } from "@/lib/solana.functions";
import { decimalToUnits, MIN_SOL_LAMPORTS } from "@/lib/onboarding";
import { poolYieldOptions } from "@/lib/pool-yield";
import { BuyUsdc } from "@/components/buy-usdc";

const MAX_MICRO = 10_000_000_000n;
const microToText = (v: bigint) => { const w = v / 1_000_000n; const f = (v % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, ""); return f ? `${w}.${f}` : `${w}`; };

export function DepositSimulation({ vault, wallet, onClose, initialAmount = "", position, migrate = false }: { vault: Vault; wallet: string | null; onClose: () => void; initialAmount?: string; position?: string; migrate?: boolean }) {
  const t = useT();
  const [amount, setAmount] = useState(initialAmount);
  const [busy, setBusy] = useState(false);
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

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>{position ? t("Depositar más ·") : t("Depositar ·")}{" "}{t(vault.name)}</DialogTitle>
    <DialogDescription>{t("Elige cuánto quieres depositar y confirma con tu wallet.")}</DialogDescription>
    <div className="flex items-center justify-between rounded-xl bg-muted p-3 text-sm">
      <span className="text-muted-foreground">{t("Rendimiento estimado")}</span>
      <span className="font-display text-lg font-bold text-primary">{apr == null ? "—" : `${apr.toFixed(2)}% APR`}</span>
    </div>
    <div className="grid gap-2 rounded-xl border border-border p-4">
      <div className="flex justify-between text-xs text-muted-foreground"><span>{t("Importe (USDC)")}</span><span>{t("Disponible:")} {usdc == null ? "—" : microToText(usdc)} USDC</span></div>
      <Input aria-label={t("Importe (USDC)")} inputMode="decimal" placeholder="0.00" value={amount} maxLength={12} disabled={busy} className="border-0 px-0 font-display text-3xl shadow-none focus-visible:ring-0" onChange={(e) => setAmount(clean(e.target.value))} />
      <div className="grid grid-cols-4 gap-2">{([25n, 50n, 75n, 100n] as const).map((p) => <Button key={p.toString()} type="button" size="sm" variant="secondary" disabled={busy || !usdc} onClick={() => pick(p)}>{p === 100n ? t("Máx") : `${p}%`}</Button>)}</div>
      <p className="text-xs text-muted-foreground">{migrate ? t("Traslado entre bóvedas: sin comisión de BÓVEDA.") : t("Entre 1 y 10,000 USDC. Comisión de 0.40% a 2% según el monto.")}</p>
      {overBalance && <p role="alert" className="text-xs text-destructive">{t("No tienes suficientes USDC para este importe.")}</p>}
    </div>
    {lowSol && <div role="note" className="grid gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs leading-5">
      <p>{t("Necesitas unos 0.015 SOL para los costos de red antes de depositar.")}</p>
      <BuyUsdc only="SOL" />
    </div>}
    {breakdown && <dl className="grid gap-2 rounded-xl bg-muted p-4 text-sm">
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Bóveda")}</dt><dd>{vault.pair}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Importe")}</dt><dd>{breakdown.gross} USDC</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Comisión de entrada")}</dt><dd className="font-semibold text-primary">{breakdown.fee} USDC</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t("Invertido neto")}</dt><dd className="font-semibold">{breakdown.net} USDC</dd></div>
      <p className="text-xs text-muted-foreground">{migrate ? t("Traslado entre bóvedas: sin comisión de BÓVEDA.") : t("Comisión de entrada según tu nivel: 2% (menos de $100), 1.25% ($100+), 0.75% ($500+), 0.40% ($2,500+).")}</p>
    </dl>}
    <p className="text-xs leading-5 text-muted-foreground">{t("Parte de tus USDC se convierte automáticamente al otro token de la bóveda. Los costos de red se pagan aparte en SOL.")}</p>
    <p role="note" className="rounded-xl border border-border p-3 text-xs leading-5 text-muted-foreground">{t("Tu capital se combina con la otra moneda de la bóveda y su valor fluctuará con el precio de mercado, mientras acumulas comisiones en cada operación.")} <a href="/faq#vaults-fluctuation" className="underline">{t("¿Por qué cambia mi balance?")}</a></p>
    {wallet ? <PilotDeposit vaultId={vault.id} amount={amount} position={position} migrate={migrate} onBusyChange={setBusy} onClose={onClose} /> : <p role="note" className="text-sm text-muted-foreground">{t("Conecta tu wallet para depositar.")}</p>}
  </DialogContent></Dialog>;
}
