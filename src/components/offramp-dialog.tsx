import { useState } from "react";
import { Banknote, CheckCircle2, LoaderCircle, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { useT } from "@/lib/i18n";
import { solanaAddressSchema } from "@/lib/solana-data";
import { buildTransfer, toBaseUnits } from "@/lib/wallet-actions";
import { withdrawFee } from "@/lib/fees";
import { CashAppBtc } from "@/components/cashapp-btc";

type Provider = "coinbase" | "paypal" | "cashapp";

/** Withdraw-to-bank guide: send USDC to the user's own exchange, then cash out there. BÓVEDA charges nothing. */
export function OfframpButton({ wallet, trial }: { wallet: string | null; trial: boolean }) {
  const t = useT();
  const { signAndSend } = useBovedaSession();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("coinbase");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sig, setSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const units = toBaseUnits(amount, "USDC");
  const fee = units ? withdrawFee(units) : 0n;
  const net = units ? units - fee : 0n;
  const addressOk = solanaAddressSchema.safeParse(to.trim()).success && to.trim() !== wallet;
  const canSend = !trial && !!wallet && addressOk && !!units && net > 0n && checked && !busy;

  async function send() {
    if (!canSend || !wallet || !units) return;
    setBusy(true); setError(null);
    try { setSig(await signAndSend(await buildTransfer({ from: wallet, to: to.trim(), asset: "USDC", amount: net, fee }))); }
    catch (e) { setError(e instanceof Error ? e.message : t("No se pudo completar la operación.")); }
    finally { setBusy(false); }
  }

  const guides: Record<Provider, { label: string; steps: string[] }> = {
    coinbase: { label: "Coinbase", steps: [
      t("En Coinbase toca «Recibir», elige USDC y la red Solana. Copia la dirección."),
      t("Pégala abajo, escribe el monto y firma. Llega en segundos."),
      t("En Coinbase toca «Retirar» (Cash out) a tu banco o tarjeta de débito. 1 USDC ≈ 1 USD."),
    ] },
    paypal: { label: "PayPal", steps: [
      t("Envía tus USDC a Coinbase con los pasos de Coinbase."),
      t("En Coinbase vincula tu PayPal y retira los dólares a PayPal."),
      t("Desde PayPal puedes pasarlos a tu banco cuando quieras."),
    ] },
    cashapp: { label: "Cash App", steps: [
      t("En Cash App abre Bitcoin → Depositar bitcoin y copia tu dirección."),
      t("Pégala abajo y escribe el monto. Convertimos tus USDC a Bitcoin y lo enviamos."),
    ] },
  };

  return <>
    <Button size="sm" onClick={() => setOpen(true)}><Banknote size={16} />{t("Retirar a banco o tarjeta")}</Button>
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}><DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{t("Retirar a banco o tarjeta")}</DialogTitle><DialogDescription>{t("Envía tus USDC a tu cuenta de exchange y desde allí pásalos a tu banco o tarjeta. BÓVEDA cobra una comisión fija del 1%.")}</DialogDescription></DialogHeader>
      <div className="grid grid-cols-3 gap-2">{(Object.keys(guides) as Provider[]).map((p) => <Button key={p} size="sm" variant={provider === p ? "default" : "outline"} onClick={() => setProvider(p)}>{guides[p].label}</Button>)}</div>
      <ol className="space-y-2">{guides[provider].steps.map((s, i) => <li key={s} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{i + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>
      {provider === "cashapp" && <p className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs"><TriangleAlert size={14} className="mt-0.5 shrink-0 text-destructive" />{t("Cash App solo recibe Bitcoin. Aquí convertimos tus USDC automáticamente; nunca envíes USDC directo a Cash App.")}</p>}
      {trial ? <p role="status" className="text-sm">{t("En Prueba los créditos son ficticios y no se pueden retirar. Cambia a Real para usar esta opción.")}</p>
        : !wallet ? <p role="status" className="text-sm">{t("Conecta tu wallet para retirar.")}</p>
        : provider === "cashapp" ? <CashAppBtc wallet={wallet} />
        : sig ? <div role="status" className="grid gap-2 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={16} />{t("¡Enviado! Tus USDC ya están en camino a tu exchange.")}</p><a className="text-xs underline" href={`https://orbmarkets.io/tx/${sig}`} target="_blank" rel="noopener noreferrer">{t("Ver comprobante")}</a><Button size="sm" variant="outline" onClick={() => { setSig(null); setAmount(""); setChecked(false); }}>{t("Hacer otro retiro")}</Button></div>
        : <div className="grid gap-3">
          <label className="grid gap-1 text-sm"><span className="font-medium">{t("Dirección USDC de tu exchange")}</span><Input value={to} onChange={(e) => setTo(e.target.value.trim())} placeholder="Ej. 7xKX…" disabled={busy} autoComplete="off" spellCheck={false} /></label>
          {to && !addressOk && <p className="text-xs text-destructive">{t("Dirección no válida")}</p>}
          <label className="grid gap-1 text-sm"><span className="font-medium">{t("Monto en USDC")}</span><Input value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} inputMode="decimal" placeholder="0.00" disabled={busy} /></label>
          {units ? <div className="grid gap-1 rounded-lg border p-3 text-xs"><div className="flex justify-between"><span>{t("Comisión de BÓVEDA (1%)")}</span><span>{(Number(fee) / 1e6).toFixed(2)} USDC</span></div><div className="flex justify-between text-sm"><span>{t("Llega a tu exchange")}</span><b>{(Number(net) / 1e6).toFixed(2)} USDC</b></div></div> : null}
          <label className="flex items-start gap-2 text-xs leading-5"><Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} disabled={busy} /><span>{t("Revisé la dirección. Si es incorrecta, el dinero no se puede recuperar.")}</span></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button disabled={!canSend} onClick={() => void send()}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{busy ? t("Firma en tu wallet…") : t("Enviar USDC")}</Button>
          <p className="text-xs text-muted-foreground">{t("Además de la comisión del 1%, pagas un costo de red de menos de un centavo. Tu exchange te mostrará sus propias condiciones para retirar al banco.")}</p>
        </div>}
    </DialogContent></Dialog>
  </>;
}
