import { useT } from "@/lib/i18n";
import { useState } from "react";
import { CreditCard, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBovedaSession } from "@/hooks/use-boveda-session";
import { QuickSwapButton } from "@/components/quick-swap";

/** Card/exchange purchase buttons for USDC and SOL. */
export function BuyUsdc({ className, only }: { className?: string; only?: "SOL" | "USDC" }) {
  const t = useT();
  const session = useBovedaSession();
  const [error, setError] = useState<string | null>(null);
  if (!session.authenticated || !session.walletAddress) return null;
  const open = (fn?: () => Promise<void>) => { if (!fn) return; setError(null); fn().catch((e: unknown) => { const m = e instanceof Error ? e.message : String(e); console.error("[BuyFunds]", e); if (/exit|clos|cancel/i.test(m)) return; setError(t("No se pudo abrir la compra: {message}", { message: t(m) })); }); };
  return <div className={className}>
    <div className="flex flex-wrap gap-2">
      {only !== "SOL" && session.buyUsdc && <Button onClick={() => open(session.buyUsdc)}><CreditCard size={16} />{t("Comprar USDC")}</Button>}
      {only !== "USDC" && session.buySol && <Button variant="outline" onClick={() => open(session.buySol)}><Fuel size={16} />{t("Añadir gas de red ($2 – $3)")}</Button>}
      {!only && <QuickSwapButton />}
    </div>
    {!only && <p className="mt-2 text-xs text-muted-foreground">{t("Compra USDC (dólares) por el monto que quieras usar. El gas de red solo necesita entre $2 y $3 y dura meses: no compres más.")}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
  </div>;
}
