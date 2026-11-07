import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FlaskConical, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { simulateRealWithdrawal } from "@/lib/withdrawal.functions";
import { withdrawalInput, type WithdrawalResult } from "@/lib/withdrawal";

export function WithdrawalSimulation({ wallet, position, vaultId, onClose }: { wallet: string | null; position?: string; vaultId: "sol" | "met"; onClose: () => void }) {
  const simulate = useServerFn(simulateRealWithdrawal);
  const [address, setAddress] = useState(wallet ?? "");
  const [positionAddress, setPositionAddress] = useState(position ?? "");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<WithdrawalResult | null>(null);
  const input = withdrawalInput.safeParse({ wallet: address, position: positionAddress, vaultId });
  async function run() {
    if (!input.success || pending) return;
    setPending(true); setResult(null);
    try { setResult(await simulate({ data: input.data })); }
    catch { setResult({ success: false, sent: false, message: "No se pudo consultar el retiro. No se firmó ni envió nada." }); }
    finally { setPending(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>Retiro a USDC · {vaultId === "sol" ? "SOL" : "MET"}</DialogTitle>
    <DialogDescription>Solana Mainnet · simulación sin firma ni movimiento de fondos.</DialogDescription>
    <label className="grid gap-2 text-sm">Wallet propietaria<Input aria-label="Wallet propietaria" value={address} disabled={pending || Boolean(wallet)} maxLength={44} onChange={(e) => { setAddress(e.target.value.trim()); setResult(null); }} /></label>
    <label className="grid gap-2 text-sm">Dirección de la posición<Input aria-label="Dirección de la posición" value={positionAddress} disabled={pending || Boolean(position)} maxLength={44} onChange={(e) => { setPositionAddress(e.target.value.trim()); setResult(null); }} /></label>
    <p className="text-xs leading-5 text-muted-foreground">Retiro completo de liquidez no bloqueada, conversión a USDC y cierre de la posición y su NFT. Comisión del 1% en USDC; la renta recuperable se devuelve en SOL y no se convierte en USDC. Las posiciones bloqueadas o con recompensas adicionales no están admitidas.</p>
    <Button disabled={pending || !input.success} onClick={() => void run()}>{pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : <FlaskConical className="mr-2 h-4 w-4" />}{pending ? "Verificando retiro…" : "Simular retiro y recuperación de renta"}</Button>
    {result && <div role="status" className="border-t border-border pt-4 text-sm"><p className="font-semibold">{result.success ? "Comprobaciones simuladas satisfactorias" : "Retiro no validado"}</p><p className="mt-2 leading-6">{result.message}</p>{result.gross && <dl className="mt-4 grid gap-2"><div className="flex justify-between gap-3"><dt>USDC antes de comisión</dt><dd>{result.gross}</dd></div><div className="flex justify-between gap-3"><dt>Comisión · 1%</dt><dd>{result.fee} USDC</dd></div><div className="flex justify-between gap-3"><dt>Devolución neta simulada</dt><dd>{result.net} USDC</dd></div><div className="flex justify-between gap-3"><dt>Renta de posición y NFT</dt><dd>{result.rentSol} SOL</dd></div></dl>}{result.checks && <ul className="mt-4 space-y-1">{Object.entries(result.checks).map(([key, valid]) => <li key={key}>{({ closed: "Cierre de posición y NFT", usdc: "Devolución de USDC", fee: "Comisión exacta", rent: "Devolución de renta en SOL" } as Record<string, string>)[key]}: {valid ? "Verificado en simulación" : "No verificado"}</li>)}</ul>}</div>}
    <p role="note" className="text-xs leading-5 text-muted-foreground">La firma del retiro sigue sin estar disponible. Una simulación no garantiza el importe final ni sustituye la confirmación en cadena.</p>
  </DialogContent></Dialog>;
}