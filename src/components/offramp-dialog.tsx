import { useState, type ReactNode } from "react";
import { Banknote, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import { CashAppBtc } from "@/components/cashapp-btc";
import { CoinbaseSell } from "@/components/coinbase-sell";

type Provider = "bank" | "cashapp";

/** Withdraw: bank/card only via Coinbase-hosted sell, or Cash App via BTC conversion. No manual address transfers. */
export function OfframpButton({ wallet, trial, trigger }: { wallet: string | null; trial: boolean; trigger?: (open: () => void) => ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<Provider>("bank");
  const options: Record<Provider, { icon: string; label: string; perk: string }> = {
    bank: { icon: "/brands/coinbase.svg", label: t("Banco o tarjeta"), perk: t("Directo a tu banco o tarjeta con Coinbase") },
    cashapp: { icon: "/brands/cashapp.svg", label: "Cash App", perk: t("Se convierte a Bitcoin · 15 a 30 min") },
  };

  return <>
    {trigger ? trigger(() => setOpen(true)) : <Button size="sm" onClick={() => setOpen(true)}><Banknote size={16} />{t("Retirar a banco o tarjeta")}</Button>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{t("Retirar a banco o tarjeta")}</DialogTitle><DialogDescription>{t("Pasa tus USDC a tu banco o tarjeta con Coinbase, o conviértelos a Bitcoin para Cash App. Comisión fija del 1%, siempre visible antes de firmar.")}</DialogDescription></DialogHeader>
      <div className="grid grid-cols-2 gap-2">{(Object.keys(options) as Provider[]).map((p) => <button key={p} type="button" onClick={() => setProvider(p)} aria-pressed={provider === p} className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${provider === p ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border hover:border-primary/50"}`}><img src={options[p].icon} alt="" width={28} height={28} className="h-7 w-7 rounded-md" /><span className="text-sm font-semibold">{options[p].label}</span><span className="text-xs text-muted-foreground">{options[p].perk}</span></button>)}</div>
      {provider === "bank" && <p className="text-xs text-muted-foreground">{t("¿Usas PayPal? Retira primero a Coinbase y desde allí pásalo a PayPal.")}</p>}
      {provider === "cashapp" && <p className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs"><TriangleAlert size={14} className="mt-0.5 shrink-0 text-destructive" />{t("Cash App solo recibe Bitcoin. Convertimos tus USDC por ti; nunca envíes USDC directo a Cash App.")}</p>}
      {trial ? <p role="status" className="text-sm">{t("En Prueba los créditos son ficticios y no se pueden retirar. Cambia a Real para usar esta opción.")}</p>
        : !wallet ? <p role="status" className="text-sm">{t("Conecta tu wallet para retirar.")}</p>
        : provider === "cashapp" ? <CashAppBtc wallet={wallet} />
        : <CoinbaseSell wallet={wallet} />}
    </DialogContent></Dialog>
  </>;
}
