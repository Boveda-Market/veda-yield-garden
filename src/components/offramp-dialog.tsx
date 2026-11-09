import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, Landmark, LoaderCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { solanaAddressSchema } from "@/lib/solana-data";
import { MIN_TRANSFER_MICRO, parseUsdcMicro } from "@/lib/usdc-transfer";
import { prepareUsdcTransfer } from "@/lib/usdc-transfer.functions";
import { pilotDepositStatus } from "@/lib/pilot-deposit.functions";

type Step = "idle" | "preparing" | "signing" | "confirming" | "done" | "error";

export function OfframpButton({ wallet, trial }: { wallet: string | null; trial: boolean }) {
  const t = useT();
  const { signAndSend } = useBovedaSession();
  const prepare = useServerFn(prepareUsdcTransfer);
  const readStatus = useServerFn(pilotDepositStatus);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [checked, setChecked] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);

  const micro = parseUsdcMicro(amount);
  const addressOk = solanaAddressSchema.safeParse(to.trim()).success && to.trim() !== wallet;
  const amountOk = micro !== null && micro >= MIN_TRANSFER_MICRO;
  const busy = step === "preparing" || step === "signing" || step === "confirming";
  const canSend = !trial && !!wallet && addressOk && amountOk && checked && !busy;

  async function send() {
    if (!canSend || !wallet || micro === null) return;
    setMessage(null); setSignature(null); setStep("preparing");
    try {
      const prepared = await prepare({ data: { from: wallet, to: to.trim(), amountMicro: micro.toString() } });
      if (!prepared.success || !prepared.transaction) { setStep("error"); setMessage(t(prepared.message ?? "No se pudo preparar la transferencia. No se movió dinero.")); return; }
      setStep("signing");
      let sig: string;
      try { sig = await signAndSend(Uint8Array.from(atob(prepared.transaction), (c) => c.charCodeAt(0))); }
      catch { setStep("error"); setMessage(t("La firma se canceló. No se envió nada.")); return; }
      setSignature(sig); setStep("confirming");
      for (let i = 0; i < 30; i++) {
        const { status } = await readStatus({ data: { signature: sig } }).catch(() => ({ status: "pending" as const }));
        if (status === "failed") { setStep("error"); setMessage(t("La red rechazó la transferencia. Tus USDC siguen en tu wallet.")); return; }
        if (status !== "pending") { setStep("done"); return; }
        await new Promise((r) => setTimeout(r, 2_000));
      }
      setStep("error"); setMessage(t("La confirmación tarda más de lo habitual. Revisa el estado antes de reintentar."));
    } catch { setStep("error"); setMessage(t("No se pudo preparar la transferencia. No se movió dinero.")); }
  }

  const steps = [
    t("Abre tu exchange (Coinbase, Kraken, Robinhood…) y busca «Depositar USDC»."),
    t("Elige la red Solana y copia la dirección que te muestra."),
    t("Pégala aquí, elige el monto y firma. Llega en segundos."),
    t("En tu exchange, vende USDC por dólares (1 USDC ≈ 1 USD) y retira a tu banco o tarjeta."),
  ];

  return <>
    <Button size="sm" onClick={() => setOpen(true)}><Banknote size={16} />{t("Retirar a banco o tarjeta")}</Button>
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}><DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{t("Retirar a banco o tarjeta")}</DialogTitle><DialogDescription>{t("Envía tus USDC a tu cuenta de exchange y desde allí pásalos a tu banco o tarjeta. BÓVEDA no cobra nada por este retiro.")}</DialogDescription></DialogHeader>
      <ol className="space-y-2">{steps.map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>
      {trial ? <p role="status" className="text-sm">{t("En Prueba los créditos son ficticios y no se pueden retirar. Cambia a Real para usar esta opción.")}</p>
        : !wallet ? <p role="status" className="text-sm">{t("Conecta tu wallet para retirar.")}</p>
        : step === "done" ? <div role="status" className="grid gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm"><p className="font-semibold">{t("¡Enviado! Tus USDC ya están en camino a tu exchange.")}</p>{signature && <a className="text-xs underline" href={`https://solscan.io/tx/${signature}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}</a>}<Button size="sm" variant="outline" onClick={() => { setStep("idle"); setAmount(""); setChecked(false); }}>{t("Hacer otro retiro")}</Button></div>
        : <div className="grid gap-3">
          <label className="grid gap-1 text-sm"><span className="font-medium">{t("Dirección USDC de tu exchange (red Solana)")}</span><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Ej. 7xKX…" disabled={busy} autoComplete="off" spellCheck={false} /></label>
          {to && !addressOk && <p className="text-xs text-destructive">{t("Revisa la dirección: debe ser de la red Solana y distinta a la tuya.")}</p>}
          <label className="grid gap-1 text-sm"><span className="font-medium">{t("Monto en USDC")}</span><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" disabled={busy} /></label>
          {amount && !amountOk && <p className="text-xs text-destructive">{t("El monto mínimo es 0.01 USDC.")}</p>}
          <label className="flex items-start gap-2 text-xs leading-5"><Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} disabled={busy} /><span>{t("Revisé la dirección. Si es incorrecta, el dinero no se puede recuperar.")}</span></label>
          {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
          <Button disabled={!canSend} onClick={send}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{step === "preparing" ? t("Preparando…") : step === "signing" ? t("Firma en tu wallet…") : step === "confirming" ? t("Confirmando…") : t("Enviar USDC")}</Button>
          <p className="flex items-start gap-2 text-xs text-muted-foreground"><Landmark size={14} className="mt-0.5 shrink-0" />{t("Solo pagas un costo de red de menos de un centavo. Tu exchange te mostrará sus propias condiciones para retirar al banco.")}</p>
        </div>}
    </DialogContent></Dialog>
  </>;
}
