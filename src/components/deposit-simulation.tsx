import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { simulationDisplay } from "@/lib/deposit-simulation";
import type { Vault } from "@/lib/vaults";
import { PilotDeposit } from "@/components/pilot-deposit";

export function DepositSimulation({ vault, wallet, onClose }: { vault: Vault; wallet: string | null; onClose: () => void }) {
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  let breakdown: ReturnType<typeof simulationDisplay> | null = null;
  try { breakdown = simulationDisplay(amount); } catch { /* Incomplete input. */ }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>Depositar · {vault.name}</DialogTitle>
    <DialogDescription>Revisa el importe y autoriza el depósito con tu wallet.</DialogDescription>
    {wallet && <p className="break-all text-xs text-muted-foreground">Wallet conectada: {wallet}</p>}
    <label className="grid gap-2 text-sm">Importe (USDC)<Input aria-label="Importe (USDC)" inputMode="decimal" value={amount} maxLength={12} disabled={busy} onChange={(event) => setAmount(event.target.value)} /></label>
    <p className="text-xs text-muted-foreground">Entre 1 y 10,000 USDC.</p>
    {breakdown && <dl className="grid gap-2 border-y border-border py-4 text-sm"><div className="flex justify-between gap-3"><dt>Total</dt><dd>{breakdown.gross} USDC</dd></div><div className="flex justify-between gap-3"><dt>Comisión de entrada · 0%</dt><dd>{breakdown.fee} USDC</dd></div><div className="flex justify-between gap-3"><dt>Disponible para el depósito</dt><dd>{breakdown.net} USDC</dd></div></dl>}
    <p className="text-xs leading-5 text-muted-foreground">Parte de tus USDC puede convertirse al otro token de la bóveda. Pueden quedar tokens en tu wallet. Los costes de red y conversión se pagan aparte.</p>
    {wallet ? <PilotDeposit vaultId={vault.id} amount={amount} onBusyChange={setBusy} /> : <p role="note" className="text-sm text-muted-foreground">Conecta tu wallet para depositar.</p>}
  </DialogContent></Dialog>;
}
