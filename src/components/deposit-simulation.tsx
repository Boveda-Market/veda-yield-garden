import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FlaskConical, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { simulateRealDeposit } from "@/lib/deposit-simulation.functions";
import { simulationInput, simulationDisplay, type SimulationResult } from "@/lib/deposit-simulation";
import { FEE_WALLET } from "@/lib/fees";
import type { Vault } from "@/lib/vaults";

export function DepositSimulation({ vault, wallet, onClose }: { vault: Vault; wallet: string | null; onClose: () => void }) {
  const simulate = useServerFn(simulateRealDeposit);
  const [amount, setAmount] = useState("1");
  const [address, setAddress] = useState(wallet ?? "");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const validated = simulationInput.safeParse({ wallet: address, vaultId: vault.id, amount });
  let breakdown: ReturnType<typeof simulationDisplay> | null = null;
  try { breakdown = simulationDisplay(amount); } catch { /* Incomplete input. */ }
  async function run() {
    if (!validated.success || pending) return;
    setPending(true); setResult(null); setError(null);
    try { setResult(await simulate({ data: validated.data })); }
    catch { setError("No se pudo completar la simulación. No se firmó ni envió una transacción."); }
    finally { setPending(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>Simular · {vault.name}</DialogTitle>
    <DialogDescription>Solana Mainnet · solo simulación. Sin firmas, envíos ni cobros reales.</DialogDescription>
    <label className="grid gap-2 text-sm">Wallet pública<Input aria-label="Wallet pública" value={address} maxLength={44} onChange={(event) => { setAddress(event.target.value.trim()); setResult(null); }} disabled={pending || Boolean(wallet)} placeholder="Dirección de Solana" /></label>
    <p className="text-xs text-muted-foreground">{wallet ? "Se utiliza la wallet conectada." : "Consultar una dirección pública no demuestra que sea tuya ni da acceso a sus fondos."}</p>
    <label className="grid gap-2 text-sm">Importe a simular (USDC)<Input aria-label="Importe a simular (USDC)" inputMode="decimal" value={amount} maxLength={10} disabled={pending} onChange={(event) => { setAmount(event.target.value); setResult(null); }} /></label>
    <p className="text-xs text-muted-foreground">Entre 1 y 2 USDC. Se utilizan los saldos existentes, sin inventar fondos.</p>
    {breakdown && <dl className="grid gap-2 border-y border-border py-4 text-sm"><div className="flex justify-between gap-3"><dt>Total</dt><dd>{breakdown.gross} USDC</dd></div><div className="flex justify-between gap-3"><dt>Comisión · 1%</dt><dd>{breakdown.fee} USDC</dd></div><div className="flex justify-between gap-3"><dt>Presupuesto de conversión y liquidez</dt><dd>{breakdown.net} USDC</dd></div></dl>}
    <p className="text-xs leading-5 text-muted-foreground">El presupuesto es un máximo: pueden quedar tokens sin depositar y se necesitan SOL para los costes de red y cuentas.</p>
    <p className="break-all text-xs text-muted-foreground">Recaudo simulado: {FEE_WALLET}</p>
    <Button disabled={!validated.success || pending} onClick={() => void run()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <FlaskConical className="mr-2 h-4 w-4" />}{pending ? "Cotizando y simulando…" : "Simular conversión y depósito"}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {result && <div role="status" className="border-t border-border pt-4 text-sm"><p className="font-semibold">{result.success ? "Simulación verificada" : "Simulación no validada"}</p><p className="mt-2 leading-6">{result.message}</p><p className="mt-2 text-xs text-muted-foreground">Etapa: {({ pool: "Pool y saldos", jupiter: "Conversión Jupiter", composition: "Composición atómica", simulation: "Simulación Solana" })[result.stage]}</p>{result.bytes !== undefined && <p className="mt-1 text-xs text-muted-foreground">Tamaño: {result.bytes} bytes</p>}{result.units !== undefined && <p className="mt-1 text-xs text-muted-foreground">Unidades de cómputo: {result.units}</p>}{result.slot !== undefined && <p className="mt-1 text-xs text-muted-foreground">Slot simulado: {result.slot}</p>}<p className="mt-3 text-xs text-muted-foreground">No hay una transacción en Solscan porque no se envía nada. Un resultado satisfactorio no habilita operaciones reales ni valida los retiros.</p></div>}
  </DialogContent></Dialog>;
}