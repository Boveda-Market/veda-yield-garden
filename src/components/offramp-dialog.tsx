import { useState } from "react";
import { Banknote, CreditCard, Landmark, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

const TRANSAK_KEY = import.meta.env["VITE_TRANSAK_API_KEY"] as string | undefined;

export function offrampUrl(wallet: string, apiKey: string) {
  const params = new URLSearchParams({ apiKey, productsAvailed: "SELL", cryptoCurrencyCode: "USDC", network: "solana", walletAddress: wallet, defaultFiatCurrency: "USD" });
  return `https://global.transak.com/?${params.toString()}`;
}

export function OfframpButton({ wallet, trial }: { wallet: string | null; trial: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ready = !trial && !!wallet && !!TRANSAK_KEY;
  const methods = [
    { icon: CreditCard, title: t("Tarjeta de débito"), text: t("Visa o Mastercard · normalmente en minutos") },
    { icon: Landmark, title: t("Transferencia bancaria"), text: t("ACH o SEPA · de 1 a 3 días hábiles") },
    { icon: Wallet, title: "PayPal", text: t("Según tu país") },
  ];
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Banknote size={16} />{t("Retirar a banco o tarjeta")}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>{t("Retirar a banco o tarjeta")}</DialogTitle><DialogDescription>{t("Convierte tus USDC en dólares con un proveedor de pagos regulado. Ellos verifican tu identidad y envían el dinero; BÓVEDA no cobra nada por este retiro.")}</DialogDescription></DialogHeader>
      <ul className="space-y-3">{methods.map(({ icon: Icon, title, text }) => <li key={title} className="flex items-start gap-3 rounded-lg border border-border p-3"><Icon size={18} className="mt-0.5 shrink-0 text-primary" /><div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{text}</p></div></li>)}</ul>
      <p className="text-xs leading-5 text-muted-foreground">{t("El proveedor muestra su comisión y el tipo de cambio antes de confirmar. Tú eliges el monto y firmas el envío con tu wallet.")}</p>
      {trial ? <p role="status" className="text-sm">{t("En Prueba los créditos son ficticios y no se pueden retirar. Cambia a Real para usar esta opción.")}</p>
        : !wallet ? <p role="status" className="text-sm">{t("Conecta tu wallet para retirar.")}</p>
        : !TRANSAK_KEY ? <p role="status" className="text-sm">{t("Muy pronto: estamos activando el proveedor de retiros.")}</p>
        : null}
      <Button disabled={!ready} onClick={() => { if (ready) window.open(offrampUrl(wallet!, TRANSAK_KEY!), "_blank", "noopener,noreferrer"); }}>{t("Continuar al retiro seguro")}</Button>
    </DialogContent></Dialog>
  </>;
}
